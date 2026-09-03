import { describe, it, expect } from "vitest";
import { calcularTotales, calcularVencimiento } from "@/lib/presupuestos";

describe("calcularTotales", () => {
  it("subtotal con cantidades decimales, 10.5 x 1200", () => {
    const r = calcularTotales([{ cantidad: 10.5, precio_unitario: 1200 }], 0);
    expect(r.subtotal).toBe(12600);
  });

  it("IVA al 21", () => {
    const r = calcularTotales([{ cantidad: 1, precio_unitario: 1000 }], 21);
    expect(r.monto_iva).toBe(210);
    expect(r.total).toBe(1210);
  });

  it("IVA al 10.5", () => {
    const r = calcularTotales([{ cantidad: 1, precio_unitario: 1000 }], 10.5);
    expect(r.monto_iva).toBe(105);
    expect(r.total).toBe(1105);
  });

  it("IVA al 0", () => {
    const r = calcularTotales([{ cantidad: 1, precio_unitario: 1000 }], 0);
    expect(r.monto_iva).toBe(0);
    expect(r.total).toBe(1000);
  });

  it("lista vacia devuelve todo en 0", () => {
    const r = calcularTotales([], 21);
    expect(r).toEqual({ subtotal: 0, monto_iva: 0, total: 0 });
  });

  it("varias lineas suman correctamente", () => {
    const r = calcularTotales(
      [
        { cantidad: 2, precio_unitario: 100 },
        { cantidad: 3, precio_unitario: 50 },
        { cantidad: 1, precio_unitario: 25 },
      ],
      0
    );
    expect(r.subtotal).toBe(375);
  });
});

describe("calcularVencimiento", () => {
  it("validez 5 dias sobre una fecha cualquiera", () => {
    const v = calcularVencimiento(new Date("2026-01-10T00:00:00"), 5);
    expect(v.getFullYear()).toBe(2026);
    expect(v.getMonth()).toBe(0);
    expect(v.getDate()).toBe(15);
  });

  it("validez que cruza fin de mes", () => {
    const v = calcularVencimiento(new Date("2026-01-30T00:00:00"), 5);
    expect(v.getFullYear()).toBe(2026);
    expect(v.getMonth()).toBe(1);
    expect(v.getDate()).toBe(4);
  });

  it("validez que cruza fin de año", () => {
    const v = calcularVencimiento(new Date("2026-12-29T00:00:00"), 5);
    expect(v.getFullYear()).toBe(2027);
    expect(v.getMonth()).toBe(0);
    expect(v.getDate()).toBe(3);
  });

  it("validez 0 devuelve la misma fecha", () => {
    const fecha = new Date("2026-03-15T00:00:00");
    const v = calcularVencimiento(fecha, 0);
    expect(v.getFullYear()).toBe(2026);
    expect(v.getMonth()).toBe(2);
    expect(v.getDate()).toBe(15);
  });
});
