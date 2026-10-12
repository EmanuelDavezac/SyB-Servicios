import { describe, it, expect } from "vitest";
import { rangoVencimiento, tipoRecordatorio } from "@/lib/recordatorios";

const HOY = new Date("2026-01-15T00:00:00.000Z");

describe("tipoRecordatorio", () => {
  it("tipoRecordatorio(3) devuelve RECORDATORIO_3D", () => {
    expect(tipoRecordatorio(3)).toBe("RECORDATORIO_3D");
  });

  it("tipoRecordatorio(0) devuelve RECORDATORIO_0D", () => {
    expect(tipoRecordatorio(0)).toBe("RECORDATORIO_0D");
  });
});

describe("rangoVencimiento", () => {
  it("0D: el rango es solo el dia de hoy", () => {
    const { inicio, fin } = rangoVencimiento(0, HOY);
    expect(inicio.toISOString()).toBe("2026-01-15T00:00:00.000Z");
    expect(fin.toISOString()).toBe("2026-01-15T23:59:59.999Z");
  });

  it("3D: el rango va de mañana a hoy + 3, nunca incluye hoy", () => {
    const { inicio, fin } = rangoVencimiento(3, HOY);
    expect(inicio.toISOString()).toBe("2026-01-16T00:00:00.000Z");
    expect(fin.toISOString()).toBe("2026-01-18T23:59:59.999Z");
  });
});
