"use server";

import { prisma } from "@/lib/prisma";
import { serializar } from "@/lib/serializar";
import { revalidatePath } from "next/cache";
import { ESTADOS_FACTURA, TOLERANCIA_MONTO, calcularEstado, esTipoFacturable } from "@/lib/estadoFactura";
import { Prisma } from "@prisma/client";
import { requerirUsuario } from "@/lib/sesion";
import { diasHastaFecha, fechaActualArgentina } from "@/lib/fechas";
import { obtenerDeudaCliente } from "@/lib/deudaCliente";

type Tx = Prisma.TransactionClient;

async function recalcularFactura(tx: Tx, id_factura: number) {
  const factura = await tx.factura.findUnique({ where: { id_factura } });
  if (!factura || factura.estado_pago === ESTADOS_FACTURA.ANULADA || factura.estado_pago === ESTADOS_FACTURA.NO_APLICA) return;

  // Las imputaciones de un recibo anulado se conservan como registro pero
  // no cuentan como pagado.
  const agregado = await tx.pagos_parciales.aggregate({
    where: { id_factura, recibo: { fecha_anulacion: null } },
    _sum: { monto_pagado: true },
  });
  const pagado = Number(agregado._sum.monto_pagado ?? 0);
  const montoTotal = Number(factura.monto_total);
  const saldo = Math.max(0, montoTotal - pagado);

  await tx.factura.update({
    where: { id_factura },
    data: {
      saldo_pendiente: saldo,
      estado_pago: calcularEstado(saldo, montoTotal),
    },
  });
}

export async function registrarCobro(data: {
  id_cliente: number;
  /**
   * Medios de pago que componen el cobro (ej. [{forma_pago:"Efectivo",
   * monto:500}, {forma_pago:"Transferencia", monto:300}]). La suma tiene que
   * dar igual a lo imputado menos las retenciones: eso es lo que realmente
   * entró en efectivo/banco, el resto quedó en poder del fisco. Opcional
   * para no romper un cobro informal sin desglose.
   */
  formasPago?: { forma_pago: string; monto: number }[];
  observacion?: string;
  fecha_pago?: Date;
  imputaciones: { id_factura: number; monto: number }[];
  retenciones?: { tipo: string; monto: number }[];
}) {
  try {
    await requerirUsuario();
    if (!data.imputaciones || data.imputaciones.length === 0) {
      return { success: false, error: "Agregá al menos una imputación a una factura." };
    }
    if (data.fecha_pago && diasHastaFecha(data.fecha_pago) > 0) {
      return { success: false, error: "La fecha de pago no puede ser posterior a hoy." };
    }
    if (data.imputaciones.some((i) => i.monto <= 0)) {
      return { success: false, error: "Los montos imputados deben ser mayores a cero." };
    }
    if (data.retenciones?.some((r) => r.monto <= 0)) {
      return { success: false, error: "Los montos de retención deben ser mayores a cero." };
    }
    if (data.formasPago?.some((f) => f.monto <= 0)) {
      return { success: false, error: "Los montos por medio de pago deben ser mayores a cero." };
    }
    if (data.formasPago && data.formasPago.length > 0) {
      const montoImputado = data.imputaciones.reduce((acc, i) => acc + i.monto, 0);
      const montoRetenido = (data.retenciones ?? []).reduce((acc, r) => acc + r.monto, 0);
      const montoEnMediosDePago = data.formasPago.reduce((acc, f) => acc + f.monto, 0);
      const montoEsperado = montoImputado - montoRetenido;
      if (Math.abs(montoEnMediosDePago - montoEsperado) > TOLERANCIA_MONTO) {
        return {
          success: false,
          error: `Los medios de pago suman ${montoEnMediosDePago.toFixed(2)} y deberían sumar ${montoEsperado.toFixed(2)} (lo imputado menos las retenciones).`,
        };
      }
    }

    // La misma factura repetida en varias imputaciones se valida contra su
    // saldo por el total, no linea por linea (700 + 700 sobre un saldo de
    // 1000 pasaba cada chequeo por separado).
    const imputadoPorFactura = new Map<number, number>();
    for (const imp of data.imputaciones) {
      imputadoPorFactura.set(imp.id_factura, (imputadoPorFactura.get(imp.id_factura) ?? 0) + imp.monto);
    }
    const idsFactura = [...imputadoPorFactura.keys()].sort((a, b) => a - b);

    const nuevoRecibo = await prisma.$transaction(async (tx) => {
      // Bloquea las facturas imputadas hasta el commit: dos cobros
      // simultaneos sobre el mismo saldo leian los dos el saldo viejo y se
      // cobraba dos veces. El segundo ahora espera y lee el saldo ya
      // actualizado. Orden por id para que dos cobros con varias facturas
      // en comun no se bloqueen mutuamente.
      await tx.$queryRaw`SELECT id_factura FROM factura WHERE id_factura IN (${Prisma.join(idsFactura)}) ORDER BY id_factura FOR UPDATE`;

      const facturas = await tx.factura.findMany({
        where: { id_factura: { in: idsFactura } },
        include: { orden_trabajo: true },
      });

      for (const [id_factura, monto] of imputadoPorFactura) {
        const imp = { id_factura, monto };
        const factura = facturas.find((f) => f.id_factura === imp.id_factura);
        if (!factura) {
          throw new Error(`Factura #${imp.id_factura} no encontrada`);
        }
        if (factura.orden_trabajo?.id_cliente !== data.id_cliente) {
          throw new Error(`Factura #${imp.id_factura} no pertenece al cliente seleccionado`);
        }
        if (factura.estado_pago === ESTADOS_FACTURA.ANULADA) {
          throw new Error(`Factura #${imp.id_factura} está anulada`);
        }
        if (factura.estado_pago === ESTADOS_FACTURA.NO_APLICA) {
          throw new Error(`Comprobante #${imp.id_factura} no admite cobros (no genera deuda)`);
        }
        if (imp.monto > Number(factura.saldo_pendiente) + TOLERANCIA_MONTO) {
          throw new Error(`El monto imputado a la factura #${imp.id_factura} supera su saldo pendiente`);
        }
      }

      const montoTotal = data.imputaciones.reduce((acc, i) => acc + i.monto, 0);

      const recibo = await tx.recibo.create({
        data: {
          id_cliente: data.id_cliente,
          fecha_pago: data.fecha_pago ?? fechaActualArgentina(),
          monto_total: montoTotal,
          observacion: data.observacion,
          recibo_medio_pago: data.formasPago && data.formasPago.length > 0
            ? { create: data.formasPago.map((f) => ({ forma_pago: f.forma_pago, monto: f.monto })) }
            : undefined,
        },
      });

      for (const imp of data.imputaciones) {
        await tx.pagos_parciales.create({
          data: {
            id_recibo: recibo.id_recibo,
            id_factura: imp.id_factura,
            monto_pagado: imp.monto,
          },
        });
      }

      for (const id_factura of idsFactura) {
        await recalcularFactura(tx, id_factura);
      }

      if (data.retenciones && data.retenciones.length > 0) {
        for (const r of data.retenciones) {
          await tx.retencion.create({
            data: {
              id_recibo: recibo.id_recibo,
              tipo: r.tipo,
              monto: r.monto,
            },
          });
        }
      }

      return recibo;
    });

    revalidatePath("/cobros");
    revalidatePath("/facturacion");
    revalidatePath("/reportes");
    return { success: true, recibo: JSON.parse(JSON.stringify(nuevoRecibo)) };
  } catch (error) {
    console.error("Error registrando cobro:", error);
    return { success: false, error: error instanceof Error ? error.message : "Error al registrar el cobro" };
  }
}

export async function anularCobro(id_recibo: number) {
  try {
    await requerirUsuario();
    await prisma.$transaction(async (tx) => {
      const recibo = await tx.recibo.findUnique({ where: { id_recibo }, include: { pagos_parciales: true } });
      if (!recibo) {
        throw new Error("El recibo no existe");
      }
      if (recibo.fecha_anulacion) {
        throw new Error("El recibo ya está anulado");
      }
      const pagos = recibo.pagos_parciales;

      // El recibo y sus imputaciones quedan como registro; recalcularFactura
      // ya no suma las imputaciones de un recibo anulado.
      await tx.recibo.update({ where: { id_recibo }, data: { fecha_anulacion: new Date() } });

      const idsFactura = [...new Set(pagos.map((p) => p.id_factura))];
      for (const id_factura of idsFactura) {
        await recalcularFactura(tx, id_factura);
      }
    });

    revalidatePath("/cobros");
    revalidatePath("/facturacion");
    revalidatePath("/reportes");
    return { success: true };
  } catch (error) {
    console.error("Error anulando cobro:", error);
    return { success: false, error: error instanceof Error ? error.message : "Error al anular el cobro" };
  }
}

export async function anularFactura(id_factura: number) {
  try {
    await requerirUsuario();
    await prisma.$transaction(async (tx) => {
      const factura = await tx.factura.findUnique({ where: { id_factura } });
      if (!factura) {
        throw new Error("La factura no existe");
      }
      if (factura.estado_pago === ESTADOS_FACTURA.ANULADA) {
        throw new Error("La factura ya está anulada");
      }

      const tienePagos = await tx.pagos_parciales.count({ where: { id_factura, recibo: { fecha_anulacion: null } } });
      if (tienePagos > 0) {
        throw new Error("No se puede anular una factura que ya tiene cobros registrados");
      }

      // Devolver al stock los insumos que se descontaron al emitir la factura
      // (crearFactura descuenta el stock de todo lo cargado en
      // detalle_orden_insumo, pero solo para comprobantes facturables: un
      // Remito no movio stock y por eso tampoco lo devuelve).
      const insumosDeOrden = esTipoFacturable(factura.tipo)
        ? await tx.detalle_orden_insumo.findMany({
            where: { id_orden: factura.id_orden },
          })
        : [];

      for (const detalle of insumosDeOrden) {
        if (detalle.id_insumo === null) continue;
        await tx.insumo.update({
          where: { id_insumo: detalle.id_insumo },
          data: {
            stock_actual: {
              increment: detalle.cantidad_usada,
            },
          },
        });
      }

      await tx.factura.update({
        where: { id_factura },
        data: { estado_pago: ESTADOS_FACTURA.ANULADA, saldo_pendiente: 0 },
      });
    });

    revalidatePath("/facturacion");
    revalidatePath("/cobros");
    revalidatePath("/reportes");
    revalidatePath("/insumos");
    return { success: true };
  } catch (error) {
    console.error("Error anulando factura:", error);
    return { success: false, error: error instanceof Error ? error.message : "Error al anular la factura" };
  }
}

export async function obtenerFacturasPendientesCliente(id_cliente: number) {
  try {
        await requerirUsuario();
    const facturas = await prisma.factura.findMany({
      where: {
        estado_pago: { in: [ESTADOS_FACTURA.IMPAGA, ESTADOS_FACTURA.PARCIAL] },
        orden_trabajo: { id_cliente },
      },
      orderBy: { fecha_emision: "asc" },
    });

    return JSON.parse(JSON.stringify(facturas));
  } catch (error) {
    console.error("Error obteniendo facturas pendientes del cliente:", error);
    return [];
  }
}

export async function obtenerClientesConDeuda() {
  try {
        await requerirUsuario();
    const facturas = await prisma.factura.findMany({
      where: {
        estado_pago: { in: [ESTADOS_FACTURA.IMPAGA, ESTADOS_FACTURA.PARCIAL] },
      },
      include: {
        orden_trabajo: { include: { cliente: true } },
      },
    });

    const porCliente = new Map<
      number,
      { id_cliente: number; nombre: string; apellido: string; saldo: number; cantidadFacturas: number }
    >();

    for (const f of facturas) {
      const cliente = f.orden_trabajo?.cliente;
      if (!cliente) continue;
      const saldo = Number(f.saldo_pendiente);
      const actual = porCliente.get(cliente.id_cliente);
      if (actual) {
        actual.saldo += saldo;
        actual.cantidadFacturas += 1;
      } else {
        porCliente.set(cliente.id_cliente, {
          id_cliente: cliente.id_cliente,
          nombre: cliente.nombre,
          apellido: cliente.apellido,
          saldo,
          cantidadFacturas: 1,
        });
      }
    }

    return Array.from(porCliente.values()).sort((a, b) => b.saldo - a.saldo);
  } catch (error) {
    console.error("Error obteniendo clientes con deuda:", error);
    return [];
  }
}

export async function obtenerDeudaPorCliente(id_cliente: number) {
  try {
        await requerirUsuario();
    const { saldo } = await obtenerDeudaCliente(prisma, id_cliente);
    return saldo;
  } catch (error) {
    console.error("Error obteniendo deuda del cliente:", error);
    return 0;
  }
}

export async function obtenerReciboCompleto(id_recibo: number) {
  try {
        await requerirUsuario();
    const recibo = await prisma.recibo.findUnique({
      where: { id_recibo },
      include: {
        cliente: true,
        pagos_parciales: { include: { factura: true } },
        recibo_medio_pago: true,
      },
    });

    if (!recibo) return null;

    const deudaRestanteCliente = await obtenerDeudaPorCliente(recibo.id_cliente);

    const resultado = {
      ...recibo,
      monto_total: Number(recibo.monto_total),
      recibo_medio_pago: recibo.recibo_medio_pago.map((m) => ({
        id_medio_pago: m.id_medio_pago,
        forma_pago: m.forma_pago,
        monto: Number(m.monto),
      })),
      pagos_parciales: recibo.pagos_parciales.map((p) => ({
        id_pago: p.id_pago,
        id_factura: p.id_factura,
        monto_pagado: Number(p.monto_pagado),
        saldo_restante: Number(p.factura.saldo_pendiente),
        factura: {
          ...p.factura,
          monto_total: Number(p.factura.monto_total),
          saldo_pendiente: Number(p.factura.saldo_pendiente),
        },
      })),
      deudaRestanteCliente,
    };

    return JSON.parse(JSON.stringify(resultado));
  } catch (error) {
    console.error("Error obteniendo recibo completo:", error);
    return null;
  }
}

export async function obtenerRetencionesDelMes(mes: number, anio: number) {
  try {
        await requerirUsuario();
    const fechaInicio = new Date(anio, mes - 1, 1);
    const fechaFin = new Date(anio, mes, 0, 23, 59, 59, 999);

    const retenciones = await prisma.retencion.findMany({
      where: {
        direccion: "SUFRIDA",
        recibo: {
          fecha_pago: { gte: fechaInicio, lte: fechaFin },
          fecha_anulacion: null,
        },
      },
    });

    const porTipo = new Map<string, number>();
    for (const r of retenciones) {
      const actual = porTipo.get(r.tipo) ?? 0;
      porTipo.set(r.tipo, actual + Number(r.monto));
    }

    return {
      IVA: porTipo.get("IVA") ?? 0,
      GANANCIAS: porTipo.get("GANANCIAS") ?? 0,
      IIBB: porTipo.get("IIBB") ?? 0,
      SUSS: porTipo.get("SUSS") ?? 0,
    };
  } catch (error) {
    console.error("Error obteniendo retenciones del mes:", error);
    return { IVA: 0, GANANCIAS: 0, IIBB: 0, SUSS: 0 };
  }
}

export async function obtenerCobros() {
  try {
        await requerirUsuario();
    const recibos = await prisma.recibo.findMany({
      include: {
        cliente: true,
        pagos_parciales: {
          include: { factura: true },
        },
        recibo_medio_pago: true,
      },
      orderBy: { fecha_pago: "desc" },
    });

    return serializar(recibos);
  } catch (error) {
    console.error("Error obteniendo cobros:", error);
    return [];
  }
}
