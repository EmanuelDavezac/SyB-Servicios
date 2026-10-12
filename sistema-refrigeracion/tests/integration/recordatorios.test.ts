import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  obtenerFacturasParaRecordatorio,
  procesarRecordatorios,
  tipoRecordatorio,
} from "@/lib/recordatorios";
import { crearCliente, crearOrdenFinalizada, crearFacturaEmitida } from "./factories";

// Mock de Resend: nada de correos reales. sendMock se reconfigura por test
// (exito, error, o secuencia de fallos+exito para probar el reintento).
const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: sendMock },
  })),
}));

// Sobrepisa, solo para este archivo, el mock global de sesion de setup.ts:
// necesitamos poder distinguir "llamo a requerirUsuario" de "no lo llamo",
// cosa que el mock de setup.ts (una funcion fija) no deja espiar.
const { requerirUsuarioMock } = vi.hoisted(() => ({
  requerirUsuarioMock: vi.fn(async () => ({
    id: "test-user-id",
    email: "test@syb-servicios.local",
    nombre: "Usuario de Test",
    rol: "administrador",
  })),
}));
vi.mock("@/lib/sesion", () => ({
  requerirUsuario: requerirUsuarioMock,
  obtenerUsuarioSesion: requerirUsuarioMock,
}));

import { enviarRecordatoriosPendientes } from "@/actions/notificaciones";

const HOY = new Date("2026-01-15T00:00:00.000Z");

function diasDesdeHoy(dias: number): Date {
  const fecha = new Date(HOY);
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha;
}

async function facturaConVencimiento(overrides: {
  estado_pago?: string;
  diasVencimiento: number;
  email?: string;
}) {
  const cliente = await crearCliente(overrides.email ? { email: overrides.email } : {});
  const orden = await crearOrdenFinalizada({ id_cliente: cliente.id_cliente });
  const factura = await crearFacturaEmitida({
    id_orden: orden.id_orden,
    monto_total: 1000,
    saldo_pendiente: 1000,
    estado_pago: overrides.estado_pago ?? "IMPAGA",
    fecha_vencimiento: diasDesdeHoy(overrides.diasVencimiento),
  });
  return { factura, cliente };
}

function historialDe(id_factura: number, tipo: string, fecha_creacion: Date) {
  return prisma.historial_notificaciones.findUnique({
    where: {
      id_factura_tipo_notificacion_fecha_creacion: {
        id_factura,
        tipo_notificacion: tipo,
        fecha_creacion,
      },
    },
  });
}

beforeEach(() => {
  sendMock.mockReset();
  sendMock.mockResolvedValue({ data: { id: "mock-id" }, error: null });
  requerirUsuarioMock.mockClear();
  process.env.RESEND_API_KEY = "test-key";
});

describe("obtenerFacturasParaRecordatorio", () => {
  it("trae IMPAGA y PARCIAL que vencen dentro del rango", async () => {
    const { factura: impaga } = await facturaConVencimiento({ estado_pago: "IMPAGA", diasVencimiento: 2 });
    const { factura: parcial } = await facturaConVencimiento({ estado_pago: "PARCIAL", diasVencimiento: 3 });

    const facturas = await obtenerFacturasParaRecordatorio(3, HOY);
    const ids = facturas.map((f) => f.id_factura);

    expect(ids).toContain(impaga.id_factura);
    expect(ids).toContain(parcial.id_factura);
  });

  it("no trae PAGADA ni ANULADA", async () => {
    const { factura: pagada } = await facturaConVencimiento({ estado_pago: "PAGADA", diasVencimiento: 1 });
    const { factura: anulada } = await facturaConVencimiento({ estado_pago: "ANULADA", diasVencimiento: 1 });

    const facturas = await obtenerFacturasParaRecordatorio(3, HOY);
    const ids = facturas.map((f) => f.id_factura);

    expect(ids).not.toContain(pagada.id_factura);
    expect(ids).not.toContain(anulada.id_factura);
  });

  it("no trae fuera del rango de anticipacion", async () => {
    const { factura: lejos } = await facturaConVencimiento({ estado_pago: "IMPAGA", diasVencimiento: 10 });

    const facturas = await obtenerFacturasParaRecordatorio(3, HOY);
    expect(facturas.map((f) => f.id_factura)).not.toContain(lejos.id_factura);
  });

  it("3D no trae lo que vence hoy: ese dia le toca el 0D", async () => {
    const { factura } = await facturaConVencimiento({ estado_pago: "IMPAGA", diasVencimiento: 0 });

    const facturas = await obtenerFacturasParaRecordatorio(3, HOY);
    expect(facturas.map((f) => f.id_factura)).not.toContain(factura.id_factura);
  });
});

describe("RECORDATORIO_3D", () => {
  it("vence en 3 dias: se envia", async () => {
    const { factura, cliente } = await facturaConVencimiento({ diasVencimiento: 3, email: "cliente@test.com" });

    const resumen = await procesarRecordatorios(3, HOY);

    expect(resumen).toEqual({ total: 1, enviados: 1, fallidos: 0, omitidos: 0 });
    const historial = await historialDe(factura.id_factura, tipoRecordatorio(3), HOY);
    expect(historial?.estado).toBe("ENVIADO");
    expect(historial?.descripcion).toContain(cliente.email);
  });

  it("vence en 2 dias sin ENVIADO previo: se envia (recuperacion de un intento anterior que no salio)", async () => {
    const { factura } = await facturaConVencimiento({ diasVencimiento: 2, email: "cliente@test.com" });

    const resumen = await procesarRecordatorios(3, HOY);

    expect(resumen.enviados).toBe(1);
    const historial = await historialDe(factura.id_factura, tipoRecordatorio(3), HOY);
    expect(historial?.estado).toBe("ENVIADO");
  });

  it("vence en 2 dias con ENVIADO previo: no se reenvia", async () => {
    const { factura } = await facturaConVencimiento({ diasVencimiento: 2, email: "cliente@test.com" });
    const ayer = diasDesdeHoy(-1);
    await prisma.historial_notificaciones.create({
      data: {
        id_factura: factura.id_factura,
        tipo_notificacion: tipoRecordatorio(3),
        fecha_creacion: ayer,
        estado: "ENVIADO",
        descripcion: "Enviado a cliente@test.com en el intento 1",
      },
    });

    const resumen = await procesarRecordatorios(3, HOY);

    expect(resumen).toEqual({ total: 0, enviados: 0, fallidos: 0, omitidos: 0 });
    expect(sendMock).not.toHaveBeenCalled();
  });
});

describe("RECORDATORIO_0D", () => {
  it("vence hoy: se envia", async () => {
    const { factura } = await facturaConVencimiento({ diasVencimiento: 0, email: "cliente@test.com" });

    const resumen = await procesarRecordatorios(0, HOY);

    expect(resumen).toEqual({ total: 1, enviados: 1, fallidos: 0, omitidos: 0 });
    const historial = await historialDe(factura.id_factura, tipoRecordatorio(0), HOY);
    expect(historial?.estado).toBe("ENVIADO");
  });

  it("con ENVIADO hoy: no se reenvia", async () => {
    const { factura } = await facturaConVencimiento({ diasVencimiento: 0, email: "cliente@test.com" });
    await prisma.historial_notificaciones.create({
      data: {
        id_factura: factura.id_factura,
        tipo_notificacion: tipoRecordatorio(0),
        fecha_creacion: HOY,
        estado: "ENVIADO",
        descripcion: "Enviado a cliente@test.com en el intento 1",
      },
    });

    const resumen = await procesarRecordatorios(0, HOY);

    expect(resumen).toEqual({ total: 0, enviados: 0, fallidos: 0, omitidos: 0 });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("el texto del mail dice 'vence hoy'", async () => {
    await facturaConVencimiento({ diasVencimiento: 0, email: "cliente@test.com" });

    await procesarRecordatorios(0, HOY);

    const html = sendMock.mock.calls[0][0].html as string;
    expect(html).toContain("vence hoy");
  });
});

describe("recuperacion tras error", () => {
  it("un ERROR previo de hoy no bloquea: la siguiente corrida reintenta y la fila pasa a ENVIADO", async () => {
    const { factura } = await facturaConVencimiento({ diasVencimiento: 0, email: "cliente@test.com" });
    await prisma.historial_notificaciones.create({
      data: {
        id_factura: factura.id_factura,
        tipo_notificacion: tipoRecordatorio(0),
        fecha_creacion: HOY,
        estado: "ERROR",
        descripcion: "Intento 1: fallo de red",
      },
    });

    const resumen = await procesarRecordatorios(0, HOY);

    expect(resumen).toEqual({ total: 1, enviados: 1, fallidos: 0, omitidos: 0 });
    const historial = await historialDe(factura.id_factura, tipoRecordatorio(0), HOY);
    expect(historial?.estado).toBe("ENVIADO");
    // Sigue siendo una sola fila para esa factura+tipo+dia (upsert, no duplica).
    const filas = await prisma.historial_notificaciones.findMany({
      where: { id_factura: factura.id_factura, tipo_notificacion: tipoRecordatorio(0) },
    });
    expect(filas).toHaveLength(1);
    // El contador de intentos sigue acumulando entre corridas.
    expect(historial?.descripcion).toContain("intento 2");
  });
});

describe("reintento interno ante fallas de Resend", () => {
  it("Resend falla 2 veces y anda a la tercera: resultado ENVIADO", async () => {
    sendMock
      .mockResolvedValueOnce({ data: null, error: { message: "fallo 1" } })
      .mockResolvedValueOnce({ data: null, error: { message: "fallo 2" } })
      .mockResolvedValueOnce({ data: { id: "ok" }, error: null });

    const { factura } = await facturaConVencimiento({ diasVencimiento: 0, email: "cliente@test.com" });

    const resumen = await procesarRecordatorios(0, HOY);

    expect(sendMock).toHaveBeenCalledTimes(3);
    expect(resumen).toEqual({ total: 1, enviados: 1, fallidos: 0, omitidos: 0 });
    const historial = await historialDe(factura.id_factura, tipoRecordatorio(0), HOY);
    expect(historial?.estado).toBe("ENVIADO");
    expect(historial?.descripcion).toContain("intento 3");
  }, 15000);
});

describe("cliente sin email", () => {
  it("queda NO_NOTIFICABLE y cuenta en omitidos, no en fallidos", async () => {
    const { factura } = await facturaConVencimiento({ diasVencimiento: 0 });

    const resumen = await procesarRecordatorios(0, HOY);

    expect(resumen).toEqual({ total: 1, enviados: 0, fallidos: 0, omitidos: 1 });
    expect(sendMock).not.toHaveBeenCalled();
    const historial = await historialDe(factura.id_factura, tipoRecordatorio(0), HOY);
    expect(historial?.estado).toBe("NO_NOTIFICABLE");
    expect(historial?.descripcion).toBe("El cliente no tiene email registrado");
  });
});

describe("independencia de la sesion", () => {
  it("procesarRecordatorios (lo que llama el cron) no llama a requerirUsuario", async () => {
    await facturaConVencimiento({ diasVencimiento: 0, email: "cliente@test.com" });

    await procesarRecordatorios(0, HOY);

    expect(requerirUsuarioMock).not.toHaveBeenCalled();
  });

  it("enviarRecordatoriosPendientes (uso manual) si exige sesion", async () => {
    await enviarRecordatoriosPendientes(0);

    expect(requerirUsuarioMock).toHaveBeenCalledTimes(1);
  });
});
