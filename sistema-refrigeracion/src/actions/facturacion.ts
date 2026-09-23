"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ESTADOS_FACTURA, esTipoFacturable } from "@/lib/estadoFactura";
import { calcularImportes, alicuotaValida, ALICUOTA_IVA_DEFAULT, type ImportesComprobante } from "@/lib/comprobantes";
import { requerirUsuario } from "@/lib/sesion";

export async function getFacturas() {
  try {
    const facturas = await prisma.factura.findMany({
      include: {
        orden_trabajo: {
          include: {
            cliente: true,
          },
        },
      },
      orderBy: {
        fecha_emision: "desc",
      },
    });

    // We do JSON stringify/parse to handle Decimals correctly if needed in client components
    return JSON.parse(JSON.stringify(facturas));
  } catch (error) {
    console.error("Error fetching facturas:", error);
    return [];
  }
}

export async function getOrdenesPendientesFacturacion() {
  try {
    // Only fetch orders that are finished but don't have an invoice yet, or simply "Finalizada"
    const ordenes = await prisma.orden_trabajo.findMany({
      where: {
        estado_trabajo: "Finalizado",
        factura: { none: {} },   // ← excluye órdenes que ya tienen al menos una factura
      },
      include: {
        cliente: true,
        factura: true,
      },
      orderBy: {
        fecha_creacion: "desc",
      },
    });

    // You can filter out orders that already have an invoice if business rules dictate 1:1 relation
    return JSON.parse(JSON.stringify(ordenes));
  } catch (error) {
    console.error("Error fetching ordenes pendientes de facturación:", error);
    return [];
  }
}

// Solo las facturas eligen si se cargan en ARCA o son internas; el resto de
// los comprobantes (ej. Remito) queda siempre con fiscal = true.
const TIPO_CON_OPCION_FISCAL = "Factura";

export async function crearFactura(data: {
  id_orden: number;
  num_factura: string;
  tipo: string;
  /** true = se carga en ARCA; false = comprobante interno (se cobra igual, lleva IVA igual) */
  fiscal: boolean;
  punto_venta?: number | null;
  descripcion?: string;
  fecha_vencimiento?: Date;
  insumos?: { id_insumo: number; cantidad: number; alicuota_iva?: number }[];
  tipo_descuento?: "PORCENTAJE" | "EQUIPO" | null;
  descuento_porcentaje?: number | null;
  descuento_monto_equipo?: number | null;
  equipo_descripcion?: string | null;
}) {
  try {
    await requerirUsuario();
    const facturable = esTipoFacturable(data.tipo);
    const fiscal = data.tipo === TIPO_CON_OPCION_FISCAL ? data.fiscal : true;
    const conPuntoVenta = fiscal && data.tipo === TIPO_CON_OPCION_FISCAL;

    const puntoVenta = conPuntoVenta ? (data.punto_venta ?? null) : null;
    if (puntoVenta !== null && (!Number.isInteger(puntoVenta) || puntoVenta < 1 || puntoVenta > 99999)) {
      throw new Error("El punto de venta debe ser un número entero entre 1 y 99999.");
    }

    for (const item of data.insumos ?? []) {
      if (item.alicuota_iva !== undefined && !alicuotaValida(item.alicuota_iva)) {
        throw new Error("La alícuota de IVA debe estar entre 0 y 100.");
      }
    }

    const nuevaFactura = await prisma.$transaction(async (tx) => {
      // 0. Evitar doble facturación de la misma orden (bug: /facturacion?orden=X
      //    setea el id directo desde la URL, sin validar si ya está facturada)
      const facturaExistente = await tx.factura.findFirst({
        where: {
          id_orden: data.id_orden,
          estado_pago: { not: ESTADOS_FACTURA.ANULADA },
        },
      });
      if (facturaExistente) {
        throw new Error(`La orden #${data.id_orden} ya tiene una factura registrada (#${facturaExistente.id_factura})`);
      }

      // 1. Calcular vencimiento por default si no se cargo a mano
      //    (fecha_emision + condicion_pago_dias del cliente). El campo manual
      //    manda si vino cargado: esto no se recalcula sobre facturas existentes.
      const fechaEmision = new Date();
      let fechaVencimiento = facturable ? data.fecha_vencimiento : null;
      if (facturable && !fechaVencimiento) {
        const orden = await tx.orden_trabajo.findUnique({
          where: { id_orden: data.id_orden },
          include: { cliente: true },
        });
        const dias = orden?.cliente?.condicion_pago_dias ?? 30;
        fechaVencimiento = new Date(fechaEmision);
        fechaVencimiento.setDate(fechaVencimiento.getDate() + dias);
      }

      // 2. Descontar stock de los insumos ya registrados en la ORDEN
      //    (agregados desde ModalOrden durante el trabajo)
      const insumosDeOrden = await tx.detalle_orden_insumo.findMany({
        where: { id_orden: data.id_orden },
        include: { insumo: true },
      });

      for (const detalle of insumosDeOrden) {
        if (detalle.id_insumo === null) continue; // id_insumo is nullable in schema; skip if missing
        await tx.insumo.update({
          where: { id_insumo: detalle.id_insumo },
          data: {
            stock_actual: {
              decrement: detalle.cantidad_usada,
            },
          },
        });
      }

      // 3. Procesar insumos adicionales pasados manualmente (compatibilidad con ModalFactura)
      //    Solo si NO están ya registrados en detalle_orden_insumo para evitar duplicados
      const idsYaRegistrados = new Set(insumosDeOrden.map((d) => d.id_insumo));

      if (data.insumos && data.insumos.length > 0) {
        for (const item of data.insumos) {
          if (idsYaRegistrados.has(item.id_insumo)) continue; // ya procesado arriba

          const insumo = await tx.insumo.findUnique({
            where: { id_insumo: item.id_insumo },
          });

          if (!insumo) {
            throw new Error(`Insumo con ID ${item.id_insumo} no encontrado`);
          }

          // Descontar stock
          await tx.insumo.update({
            where: { id_insumo: item.id_insumo },
            data: {
              stock_actual: {
                decrement: item.cantidad,
              },
            },
          });

          // Registrar en el detalle de la orden
          await tx.detalle_orden_insumo.create({
            data: {
              id_orden: data.id_orden,
              id_insumo: item.id_insumo,
              cantidad_usada: item.cantidad,
              precio_aplicado: insumo.precio_venta,
              alicuota_iva: item.alicuota_iva ?? ALICUOTA_IVA_DEFAULT,
            },
          });
        }
      }

      // 4. Calcular importes a partir de las lineas guardadas en la orden
      //    (incluye los insumos adicionales recien agregados). No se usa
      //    ningun monto que venga del cliente.
      let importes: ImportesComprobante | null = null;
      if (facturable) {
        const [serviciosOrden, insumosOrden] = await Promise.all([
          tx.detalle_orden_servicio.findMany({ where: { id_orden: data.id_orden } }),
          tx.detalle_orden_insumo.findMany({ where: { id_orden: data.id_orden } }),
        ]);
        const lineas = [
          ...serviciosOrden.map((s) => ({
            neto: (s.cantidad || 1) * Number(s.precio_acordado),
            alicuota: Number(s.alicuota_iva),
          })),
          ...insumosOrden.map((i) => ({
            neto: Number(i.cantidad_usada) * Number(i.precio_aplicado),
            alicuota: Number(i.alicuota_iva),
          })),
        ];
        importes = calcularImportes({
          lineas,
          tipoDescuento: data.tipo_descuento,
          descuentoPorcentaje: data.descuento_porcentaje,
          descuentoMontoEquipo: data.descuento_monto_equipo,
          equipoDescripcion: data.equipo_descripcion,
          facturable,
        });
        if (importes.netoBruto <= 0) {
          throw new Error("La orden no tiene servicios ni insumos con precio para facturar.");
        }
      }

      // 5. Crear la factura y su IVA discriminado por alicuota
      const alicuotaUnica = importes && importes.desglose.length === 1 ? importes.desglose[0].alicuota : null;
      const factura = await tx.factura.create({
        data: {
          id_orden: data.id_orden,
          num_factura: data.num_factura,
          tipo: data.tipo,
          fiscal,
          punto_venta: puntoVenta,
          fecha_emision: fechaEmision,
          fecha_vencimiento: fechaVencimiento,
          neto: importes ? importes.netoGravado : null,
          alicuota_iva: alicuotaUnica,
          tipo_descuento: facturable ? (data.tipo_descuento ?? null) : null,
          descuento_porcentaje: facturable && data.tipo_descuento === "PORCENTAJE" ? (data.descuento_porcentaje ?? null) : null,
          descuento_monto: importes ? importes.descuentoMonto : null,
          equipo_descripcion: facturable && data.tipo_descuento === "EQUIPO" ? (data.equipo_descripcion?.trim() ?? null) : null,
          monto_total: importes ? importes.montoTotal : 0,
          saldo_pendiente: importes ? importes.montoTotal : 0,
          estado_pago: facturable ? ESTADOS_FACTURA.IMPAGA : ESTADOS_FACTURA.NO_APLICA,
          descripcion: data.descripcion,
          factura_iva: importes
            ? {
                create: importes.desglose.map((d) => ({
                  alicuota: d.alicuota,
                  neto_gravado: d.netoGravado,
                  monto_iva: d.montoIva,
                })),
              }
            : undefined,
        },
        include: { factura_iva: true },
      });

      return factura;
    });

    revalidatePath("/facturacion");
    revalidatePath("/insumos");
    revalidatePath("/ordenes");
    return { success: true, factura: JSON.parse(JSON.stringify(nuevaFactura)) };
  } catch (error) {
    console.error("Error creating factura:", error);
    return { success: false, error: error instanceof Error ? error.message : "Error al crear la factura" };
  }
}

export async function getFacturaCompleta(id_factura: number) {
  try {
    const factura = await prisma.factura.findUnique({
      where: { id_factura },
      include: {
        factura_iva: { orderBy: { alicuota: "desc" } },
        orden_trabajo: {
          include: {
            cliente: true,
            detalle_orden_servicio: {
              include: { servicio: true }
            },
            detalle_orden_insumo: {
              include: { insumo: true }
            },
          },
        },
      },
    });

    if (!factura) return null;
    return JSON.parse(JSON.stringify(factura));
  } catch (error) {
    console.error("Error fetching factura completa:", error);
    return null;
  }
}
