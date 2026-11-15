import { describe, it, expect, vi } from "vitest";
import { conTimeout, ErrorTimeout, mensajeErrorDeRed } from "@/lib/conTimeout";

describe("conTimeout", () => {
  it("devuelve el resultado si la promesa responde a tiempo", async () => {
    await expect(conTimeout(Promise.resolve("ok"), 50)).resolves.toBe("ok");
  });

  it("propaga el error original si la promesa falla", async () => {
    await expect(conTimeout(Promise.reject(new Error("red caida")), 50)).rejects.toThrow("red caida");
  });

  it("corta con ErrorTimeout si la promesa nunca responde", async () => {
    vi.useFakeTimers();
    const colgada = new Promise<string>(() => {});
    const espera = conTimeout(colgada, 1000);
    const verificacion = expect(espera).rejects.toBeInstanceOf(ErrorTimeout);
    await vi.advanceTimersByTimeAsync(1000);
    await verificacion;
    vi.useRealTimers();
  });
});

describe("mensajeErrorDeRed", () => {
  it("en timeout avisa que pudo haberse guardado igual", () => {
    expect(mensajeErrorDeRed(new ErrorTimeout(), "el presupuesto")).toContain("revisá el listado");
  });

  it("en error de red pide reintentar", () => {
    expect(mensajeErrorDeRed(new TypeError("Failed to fetch"), "el presupuesto")).toContain("Revisá tu conexión");
  });
});
