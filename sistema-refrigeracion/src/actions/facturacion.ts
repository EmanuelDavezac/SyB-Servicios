"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ESTADOS_FACTURA } from "@/lib/estadoFactura";

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

export async function crearFactura(data: {
  id_orden: number;
  num_factura: string;
  tipo: string;
  neto: number;
  alicuota_iva: number;
  descripcion?: string;
  fecha_vencimiento?: Date;
  insumos?: { id_insumo: number; cantidad: number }[];
}) {
  try {
    const montoTotal = data.neto + data.neto * (data.alicuota_iva / 100);

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

      // 1. Crear la factura
      const factura = await tx.factura.create({
        data: {
          id_orden: data.id_orden,
          num_factura: data.num_factura,
          tipo: data.tipo,
          fecha_emision: new Date(),
          fecha_vencimiento: data.fecha_vencimiento,
          neto: data.neto,
          alicuota_iva: data.alicuota_iva,
          monto_total: montoTotal,
          saldo_pendiente: montoTotal,
          estado_pago: ESTADOS_FACTURA.IMPAGA,
          descripcion: data.descripcion,
        },
      });

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
            },
          });
        }
      }

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
