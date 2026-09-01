"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ESTADOS_FACTURA, TOLERANCIA_MONTO, calcularEstado } from "@/lib/estadoFactura";
import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

async function recalcularFactura(tx: Tx, id_factura: number) {
  const factura = await tx.factura.findUnique({ where: { id_factura } });
  if (!factura || factura.estado_pago === ESTADOS_FACTURA.ANULADA || factura.estado_pago === ESTADOS_FACTURA.NO_APLICA) return;

  const agregado = await tx.pagos_parciales.aggregate({
    where: { id_factura },
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
  forma_pago?: string;
  observacion?: string;
  fecha_pago?: Date;
  imputaciones: { id_factura: number; monto: number }[];
  retenciones?: { tipo: string; monto: number }[];
}) {
  try {
    if (!data.imputaciones || data.imputaciones.length === 0) {
      return { success: false, error: "Agregá al menos una imputación a una factura." };
    }
    if (data.imputaciones.some((i) => i.monto <= 0)) {
      return { success: false, error: "Los montos imputados deben ser mayores a cero." };
    }
    if (data.retenciones?.some((r) => r.monto <= 0)) {
      return { success: false, error: "Los montos de retención deben ser mayores a cero." };
    }

    const nuevoRecibo = await prisma.$transaction(async (tx) => {
      const idsFactura = data.imputaciones.map((i) => i.id_factura);
      const facturas = await tx.factura.findMany({
        where: { id_factura: { in: idsFactura } },
        include: { orden_trabajo: true },
      });

      for (const imp of data.imputaciones) {
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
          fecha_pago: data.fecha_pago ?? new Date(),
          monto_total: montoTotal,
          forma_pago: data.forma_pago,
          observacion: data.observacion,
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
    await prisma.$transaction(async (tx) => {
      const pagos = await tx.pagos_parciales.findMany({ where: { id_recibo } });
      if (pagos.length === 0) {
        throw new Error("El recibo no existe o no tiene imputaciones");
      }

      await tx.recibo.delete({ where: { id_recibo } });

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
    const tienePagos = await prisma.pagos_parciales.count({ where: { id_factura } });
    if (tienePagos > 0) {
      return { success: false, error: "No se puede anular una factura que ya tiene cobros registrados" };
    }

    await prisma.factura.update({
      where: { id_factura },
      data: { estado_pago: ESTADOS_FACTURA.ANULADA, saldo_pendiente: 0 },
    });

    revalidatePath("/facturacion");
    revalidatePath("/cobros");
    revalidatePath("/reportes");
    return { success: true };
  } catch (error) {
    console.error("Error anulando factura:", error);
    return { success: false, error: "Error al anular la factura" };
  }
}

export async function obtenerFacturasPendientesCliente(id_cliente: number) {
  try {
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
    const agregado = await prisma.factura.aggregate({
      where: {
        estado_pago: { in: [ESTADOS_FACTURA.IMPAGA, ESTADOS_FACTURA.PARCIAL] },
        orden_trabajo: { id_cliente },
      },
      _sum: { saldo_pendiente: true },
    });

    return Number(agregado._sum.saldo_pendiente ?? 0);
  } catch (error) {
    console.error("Error obteniendo deuda del cliente:", error);
    return 0;
  }
}

export async function obtenerReciboCompleto(id_recibo: number) {
  try {
    const recibo = await prisma.recibo.findUnique({
      where: { id_recibo },
      include: {
        cliente: true,
        pagos_parciales: { include: { factura: true } },
      },
    });

    if (!recibo) return null;

    const deudaRestanteCliente = await obtenerDeudaPorCliente(recibo.id_cliente);

    const resultado = {
      ...recibo,
      monto_total: Number(recibo.monto_total),
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
    const fechaInicio = new Date(anio, mes - 1, 1);
    const fechaFin = new Date(anio, mes, 0, 23, 59, 59, 999);

    const retenciones = await prisma.retencion.findMany({
      where: {
        direccion: "SUFRIDA",
        recibo: {
          fecha_pago: { gte: fechaInicio, lte: fechaFin },
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
    const recibos = await prisma.recibo.findMany({
      include: {
        cliente: true,
        pagos_parciales: {
          include: { factura: true },
        },
      },
      orderBy: { fecha_pago: "desc" },
    });

    return JSON.parse(JSON.stringify(recibos));
  } catch (error) {
    console.error("Error obteniendo cobros:", error);
    return [];
  }
}
