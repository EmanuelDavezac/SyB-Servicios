import { describe, it, expect } from "vitest";
import { inicioDelDiaUTC, tipoRecordatorio } from "@/lib/recordatorios";

describe("inicioDelDiaUTC", () => {
  it("hora local UTC-3 (10:00) devuelve medianoche UTC del dia correcto", () => {
    const fecha = new Date("2026-01-15T10:00:00-03:00");
    const r = inicioDelDiaUTC(fecha);
    expect(r.toISOString()).toBe("2026-01-15T00:00:00.000Z");
  });

  it("hora local UTC-3 a las 23:00: caso borde conocido, corre al dia UTC siguiente", () => {
    // 23:00 del 15/01 en UTC-3 son las 02:00 UTC del 16/01. inicioDelDiaUTC
    // trunca en UTC, asi que devuelve medianoche del 16, no del 15 local.
    const fecha = new Date("2026-01-15T23:00:00-03:00");
    const r = inicioDelDiaUTC(fecha);
    expect(r.toISOString()).toBe("2026-01-16T00:00:00.000Z");
  });
});

describe("tipoRecordatorio", () => {
  it("tipoRecordatorio(3) devuelve RECORDATORIO_3D", () => {
    expect(tipoRecordatorio(3)).toBe("RECORDATORIO_3D");
  });
});
