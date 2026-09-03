import { describe, it, expect } from "vitest";
import { calcularEstado, esTipoFacturable, ESTADOS_FACTURA } from "@/lib/estadoFactura";

describe("calcularEstado", () => {
  it("saldo 0 sobre total 1000 devuelve PAGADA", () => {
    expect(calcularEstado(0, 1000)).toBe(ESTADOS_FACTURA.PAGADA);
  });

  it("saldo 1000 sobre total 1000 devuelve IMPAGA", () => {
    expect(calcularEstado(1000, 1000)).toBe(ESTADOS_FACTURA.IMPAGA);
  });

  it("saldo 400 sobre total 1000 devuelve PARCIAL", () => {
    expect(calcularEstado(400, 1000)).toBe(ESTADOS_FACTURA.PARCIAL);
  });

  it("saldo 0.0005 (por debajo de TOLERANCIA_MONTO) devuelve PAGADA", () => {
    expect(calcularEstado(0.0005, 1000)).toBe(ESTADOS_FACTURA.PAGADA);
  });

  it("saldo 999.9995 devuelve IMPAGA y no PARCIAL", () => {
    expect(calcularEstado(999.9995, 1000)).toBe(ESTADOS_FACTURA.IMPAGA);
  });

  it("saldo negativo devuelve PAGADA sin romper", () => {
    expect(calcularEstado(-50, 1000)).toBe(ESTADOS_FACTURA.PAGADA);
  });

  it("total 0 con saldo 0: comportamiento actual documentado", () => {
    // saldoPendiente (0) <= TOLERANCIA_MONTO se evalua primero, asi que
    // devuelve PAGADA independientemente de que el total tambien sea 0.
    expect(calcularEstado(0, 0)).toBe(ESTADOS_FACTURA.PAGADA);
  });
});

describe("esTipoFacturable", () => {
  it('"Factura" devuelve true', () => {
    expect(esTipoFacturable("Factura")).toBe(true);
  });

  it('"Remito" devuelve true', () => {
    expect(esTipoFacturable("Remito")).toBe(true);
  });

  it('"Informe Tecnico" devuelve false', () => {
    expect(esTipoFacturable("Informe Tecnico")).toBe(false);
  });

  it('"Informe Técnico" con tilde devuelve false', () => {
    expect(esTipoFacturable("Informe Técnico")).toBe(false);
  });

  it("null devuelve false", () => {
    expect(esTipoFacturable(null)).toBe(false);
  });

  it("undefined devuelve false", () => {
    expect(esTipoFacturable(undefined)).toBe(false);
  });

  it("cadena vacia devuelve false", () => {
    expect(esTipoFacturable("")).toBe(false);
  });

  it('"Presupuesto" (valor heredado) devuelve false', () => {
    expect(esTipoFacturable("Presupuesto")).toBe(false);
  });

  it('"Recibo" (valor heredado) devuelve false', () => {
    expect(esTipoFacturable("Recibo")).toBe(false);
  });

  it('"factura" en minusculas: comportamiento actual documentado', () => {
    // La comparacion contra TIPOS_COMPROBANTE_FACTURABLE es case-sensitive,
    // por eso "factura" en minusculas no matchea "Factura" y da false.
    expect(esTipoFacturable("factura")).toBe(false);
  });
});
