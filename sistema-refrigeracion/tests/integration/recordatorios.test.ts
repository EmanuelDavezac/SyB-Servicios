import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import { obtenerFacturasParaRecordatorio, inicioDelDiaUTC, tipoRecordatorio } from "@/lib/recordatorios";
import { crearCliente, crearOrdenFinalizada, crearFacturaEmitida } from "./factories";

function diasDesdeHoy(dias: number): Date {
  const fecha = inicioDelDiaUTC(new Date());
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha;
}

async function facturaConVencimiento(overrides: {
  estado_pago?: string;
  diasVencimiento: number;
}) {
  const cliente = await crearCliente();
  const orden = await crearOrdenFinalizada({ id_cliente: cliente.id_cliente });
  return crearFacturaEmitida({
    id_orden: orden.id_orden,
    monto_total: 1000,
    saldo_pendiente: 1000,
    estado_pago: overrides.estado_pago ?? "IMPAGA",
    fecha_vencimiento: diasDesdeHoy(overrides.diasVencimiento),
  });
}

describe("obtenerFacturasParaRecordatorio", () => {
  it("trae IMPAGA y PARCIAL que vencen dentro del rango", async () => {
    const impaga = await facturaConVencimiento({ estado_pago: "IMPAGA", diasVencimiento: 2 });
    const parcial = await facturaConVencimiento({ estado_pago: "PARCIAL", diasVencimiento: 3 });

    const facturas = await obtenerFacturasParaRecordatorio(3);
    const ids = facturas.map((f) => f.id_factura);

    expect(ids).toContain(impaga.id_factura);
    expect(ids).toContain(parcial.id_factura);
  });

  it("no trae PAGADA ni ANULADA", async () => {
    const pagada = await facturaConVencimiento({ estado_pago: "PAGADA", diasVencimiento: 1 });
    const anulada = await facturaConVencimiento({ estado_pago: "ANULADA", diasVencimiento: 1 });

    const facturas = await obtenerFacturasParaRecordatorio(3);
    const ids = facturas.map((f) => f.id_factura);

    expect(ids).not.toContain(pagada.id_factura);
    expect(ids).not.toContain(anulada.id_factura);
  });

  it("no trae fuera del rango de anticipacion", async () => {
    const lejos = await facturaConVencimiento({ estado_pago: "IMPAGA", diasVencimiento: 10 });

    const facturas = await obtenerFacturasParaRecordatorio(3);
    const ids = facturas.map((f) => f.id_factura);

    expect(ids).not.toContain(lejos.id_factura);
  });

  it("no trae una que ya tiene recordatorio del mismo tipo registrado hoy", async () => {
    const factura = await facturaConVencimiento({ estado_pago: "IMPAGA", diasVencimiento: 2 });
    await prisma.historial_notificaciones.create({
      data: {
        id_factura: factura.id_factura,
        tipo_notificacion: tipoRecordatorio(3),
        fecha_creacion: inicioDelDiaUTC(new Date()),
      },
    });

    const facturas = await obtenerFacturasParaRecordatorio(3);
    expect(facturas.map((f) => f.id_factura)).not.toContain(factura.id_factura);
  });

  it("si la trae si el recordatorio registrado es de otro tipo", async () => {
    const factura = await facturaConVencimiento({ estado_pago: "IMPAGA", diasVencimiento: 2 });
    await prisma.historial_notificaciones.create({
      data: {
        id_factura: factura.id_factura,
        tipo_notificacion: tipoRecordatorio(7),
        fecha_creacion: inicioDelDiaUTC(new Date()),
      },
    });

    const facturas = await obtenerFacturasParaRecordatorio(3);
    expect(facturas.map((f) => f.id_factura)).toContain(factura.id_factura);
  });

  it("si la trae si el recordatorio registrado es de otro dia", async () => {
    const factura = await facturaConVencimiento({ estado_pago: "IMPAGA", diasVencimiento: 2 });
    const ayer = inicioDelDiaUTC(new Date());
    ayer.setUTCDate(ayer.getUTCDate() - 1);
    await prisma.historial_notificaciones.create({
      data: {
        id_factura: factura.id_factura,
        tipo_notificacion: tipoRecordatorio(3),
        fecha_creacion: ayer,
      },
    });

    const facturas = await obtenerFacturasParaRecordatorio(3);
    expect(facturas.map((f) => f.id_factura)).toContain(factura.id_factura);
  });
});
