import { describe, it, expect } from "vitest";
import { calcularImportes } from "@/lib/comprobantes";

describe("calcularImportes", () => {
  it("sin descuento, neto 1000 al 21% da total 1210", () => {
    const r = calcularImportes({ neto: 1000, alicuotaIva: 21, facturable: true });
    expect(r.descuentoMonto).toBeNull();
    expect(r.netoGravado).toBe(1000);
    expect(r.montoTotal).toBe(1210);
  });

  it("descuento por porcentaje se aplica sobre el neto antes del IVA, no sobre el total", () => {
    const r = calcularImportes({
      neto: 1000,
      alicuotaIva: 21,
      tipoDescuento: "PORCENTAJE",
      descuentoPorcentaje: 10,
      facturable: true,
    });
    expect(r.descuentoMonto).toBe(100);
    expect(r.netoGravado).toBe(900);
    expect(r.montoTotal).toBe(900 + 900 * 0.21);
  });

  it("porcentaje 0 no cambia el importe", () => {
    const r = calcularImportes({
      neto: 1000,
      alicuotaIva: 21,
      tipoDescuento: "PORCENTAJE",
      descuentoPorcentaje: 0,
      facturable: true,
    });
    expect(r.descuentoMonto).toBe(0);
    expect(r.netoGravado).toBe(1000);
    expect(r.montoTotal).toBe(1210);
  });

  it("porcentaje 100 deja el neto gravado en 0", () => {
    const r = calcularImportes({
      neto: 1000,
      alicuotaIva: 21,
      tipoDescuento: "PORCENTAJE",
      descuentoPorcentaje: 100,
      facturable: true,
    });
    expect(r.descuentoMonto).toBe(1000);
    expect(r.netoGravado).toBe(0);
    expect(r.montoTotal).toBe(0);
  });

  it("porcentaje 101 lanza error", () => {
    expect(() =>
      calcularImportes({ neto: 1000, alicuotaIva: 21, tipoDescuento: "PORCENTAJE", descuentoPorcentaje: 101, facturable: true })
    ).toThrow("El porcentaje de descuento debe estar entre 0 y 100.");
  });

  it("porcentaje negativo lanza error", () => {
    expect(() =>
      calcularImportes({ neto: 1000, alicuotaIva: 21, tipoDescuento: "PORCENTAJE", descuentoPorcentaje: -1, facturable: true })
    ).toThrow("El porcentaje de descuento debe estar entre 0 y 100.");
  });

  it("descuento por equipo resta del neto antes del IVA", () => {
    const r = calcularImportes({
      neto: 1000,
      alicuotaIva: 21,
      tipoDescuento: "EQUIPO",
      descuentoMontoEquipo: 300,
      equipoDescripcion: "Heladera vieja",
      facturable: true,
    });
    expect(r.descuentoMonto).toBe(300);
    expect(r.netoGravado).toBe(700);
    expect(r.montoTotal).toBe(700 + 700 * 0.21);
  });

  it("descuento por equipo igual al neto lanza error", () => {
    expect(() =>
      calcularImportes({
        neto: 1000,
        alicuotaIva: 21,
        tipoDescuento: "EQUIPO",
        descuentoMontoEquipo: 1000,
        equipoDescripcion: "Heladera vieja",
        facturable: true,
      })
    ).toThrow("El descuento no puede igualar o superar el subtotal de la factura.");
  });

  it("descuento por equipo mayor al neto lanza error", () => {
    expect(() =>
      calcularImportes({
        neto: 1000,
        alicuotaIva: 21,
        tipoDescuento: "EQUIPO",
        descuentoMontoEquipo: 1500,
        equipoDescripcion: "Heladera vieja",
        facturable: true,
      })
    ).toThrow("El descuento no puede igualar o superar el subtotal de la factura.");
  });

  it("descuento por equipo con importe 0 lanza error", () => {
    expect(() =>
      calcularImportes({
        neto: 1000,
        alicuotaIva: 21,
        tipoDescuento: "EQUIPO",
        descuentoMontoEquipo: 0,
        equipoDescripcion: "Heladera vieja",
        facturable: true,
      })
    ).toThrow("El importe del equipo debe ser mayor a cero.");
  });

  it("descuento por equipo con importe negativo lanza error", () => {
    expect(() =>
      calcularImportes({
        neto: 1000,
        alicuotaIva: 21,
        tipoDescuento: "EQUIPO",
        descuentoMontoEquipo: -50,
        equipoDescripcion: "Heladera vieja",
        facturable: true,
      })
    ).toThrow("El importe del equipo debe ser mayor a cero.");
  });

  it("descuento por equipo sin descripcion lanza error", () => {
    expect(() =>
      calcularImportes({
        neto: 1000,
        alicuotaIva: 21,
        tipoDescuento: "EQUIPO",
        descuentoMontoEquipo: 300,
        equipoDescripcion: "",
        facturable: true,
      })
    ).toThrow("Debe indicar qué equipo entrega el cliente en parte de pago.");
  });

  it("tipo no facturable devuelve montoTotal 0 y no aplica descuentos", () => {
    const r = calcularImportes({
      neto: 1000,
      alicuotaIva: 21,
      tipoDescuento: "PORCENTAJE",
      descuentoPorcentaje: 50,
      facturable: false,
    });
    expect(r.descuentoMonto).toBeNull();
    expect(r.netoGravado).toBe(0);
    expect(r.montoTotal).toBe(0);
  });

  it("alicuota 0", () => {
    const r = calcularImportes({ neto: 1000, alicuotaIva: 0, facturable: true });
    expect(r.montoTotal).toBe(1000);
  });

  it("alicuota 10.5", () => {
    const r = calcularImportes({ neto: 1000, alicuotaIva: 10.5, facturable: true });
    expect(r.montoTotal).toBe(1105);
  });
});
