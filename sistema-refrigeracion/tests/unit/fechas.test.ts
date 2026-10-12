import { describe, it, expect, vi, afterEach } from "vitest";
import { diasHastaFecha, fechaActualArgentina } from "@/lib/fechas";

// Asi llega una columna @db.Date desde Prisma: medianoche UTC.
const vence = new Date("2026-10-15T00:00:00.000Z");

describe("diasHastaFecha", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("devuelve 0 si vence hoy (no resta un dia por UTC-3)", () => {
    expect(diasHastaFecha(vence, new Date("2026-10-15T00:00:00.000Z"))).toBe(0);
  });

  it("cuenta dias hacia adelante", () => {
    expect(diasHastaFecha(vence, new Date("2026-10-14T00:00:00.000Z"))).toBe(1);
    expect(diasHastaFecha(vence, new Date("2026-10-08T00:00:00.000Z"))).toBe(7);
  });

  it("es negativo si ya vencio", () => {
    expect(diasHastaFecha(vence, new Date("2026-10-16T00:00:00.000Z"))).toBe(-1);
  });

  it("acepta la fecha como string (serializada)", () => {
    expect(diasHastaFecha("2026-10-15T00:00:00.000Z", new Date("2026-10-13T00:00:00.000Z"))).toBe(2);
  });

  it("ignora la hora de `hoy` y compara solo el dia", () => {
    expect(diasHastaFecha(vence, new Date("2026-10-14T23:30:00.000Z"))).toBe(1);
  });

  it("usa la fecha de Argentina por defecto: a las 22hs del 14 todavia falta 1 dia", () => {
    vi.useFakeTimers();
    // 2026-10-15 01:00 UTC = 2026-10-14 22:00 en Argentina (UTC-3)
    vi.setSystemTime(new Date("2026-10-15T01:00:00.000Z"));
    expect(fechaActualArgentina().toISOString()).toBe("2026-10-14T00:00:00.000Z");
    expect(diasHastaFecha(vence)).toBe(1);
  });
});
