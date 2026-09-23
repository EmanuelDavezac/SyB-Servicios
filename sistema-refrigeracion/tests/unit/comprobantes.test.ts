import { describe, it, expect } from "vitest";
import { calcularImportes } from "@/lib/comprobantes";

const una = (neto: number, alicuota = 21) => [{ neto, alicuota }];

describe("calcularImportes", () => {
  it("sin descuento, neto 1000 al 21% da total 1210", () => {
    const r = calcularImportes({ lineas: una(1000), facturable: true });
    expect(r.descuentoMonto).toBeNull();
    expect(r.netoBruto).toBe(1000);
    expect(r.netoGravado).toBe(1000);
    expect(r.montoIva).toBe(210);
    expect(r.montoTotal).toBe(1210);
    expect(r.desglose).toEqual([{ alicuota: 21, netoGravado: 1000, montoIva: 210 }]);
  });

  it("descuento por porcentaje se aplica sobre el neto antes del IVA, no sobre el total", () => {
    const r = calcularImportes({
      lineas: una(1000),
      tipoDescuento: "PORCENTAJE",
      descuentoPorcentaje: 10,
      facturable: true,
    });
    expect(r.descuentoMonto).toBe(100);
    expect(r.netoGravado).toBe(900);
    expect(r.montoTotal).toBe(1089);
  });

  it("porcentaje 0 no cambia el importe", () => {
    const r = calcularImportes({
      lineas: una(1000),
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
      lineas: una(1000),
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
      calcularImportes({ lineas: una(1000), tipoDescuento: "PORCENTAJE", descuentoPorcentaje: 101, facturable: true })
    ).toThrow("El porcentaje de descuento debe estar entre 0 y 100.");
  });

  it("porcentaje negativo lanza error", () => {
    expect(() =>
      calcularImportes({ lineas: una(1000), tipoDescuento: "PORCENTAJE", descuentoPorcentaje: -1, facturable: true })
    ).toThrow("El porcentaje de descuento debe estar entre 0 y 100.");
  });

  it("descuento por equipo resta del neto antes del IVA", () => {
    const r = calcularImportes({
      lineas: una(1000),
      tipoDescuento: "EQUIPO",
      descuentoMontoEquipo: 300,
      equipoDescripcion: "Heladera vieja",
      facturable: true,
    });
    expect(r.descuentoMonto).toBe(300);
    expect(r.netoGravado).toBe(700);
    expect(r.montoTotal).toBe(847);
  });

  it("descuento por equipo igual al neto lanza error", () => {
    expect(() =>
      calcularImportes({
        lineas: una(1000),
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
        lineas: una(1000),
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
        lineas: una(1000),
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
        lineas: una(1000),
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
        lineas: una(1000),
        tipoDescuento: "EQUIPO",
        descuentoMontoEquipo: 300,
        equipoDescripcion: "",
        facturable: true,
      })
    ).toThrow("Debe indicar qué equipo entrega el cliente en parte de pago.");
  });

  it("tipo no facturable devuelve montoTotal 0 y no aplica descuentos", () => {
    const r = calcularImportes({
      lineas: una(1000),
      tipoDescuento: "PORCENTAJE",
      descuentoPorcentaje: 50,
      facturable: false,
    });
    expect(r.descuentoMonto).toBeNull();
    expect(r.netoGravado).toBe(0);
    expect(r.montoTotal).toBe(0);
    expect(r.desglose).toEqual([]);
  });

  it("alicuota 0", () => {
    const r = calcularImportes({ lineas: una(1000, 0), facturable: true });
    expect(r.montoTotal).toBe(1000);
  });

  it("alicuota 10.5", () => {
    const r = calcularImportes({ lineas: una(1000, 10.5), facturable: true });
    expect(r.montoTotal).toBe(1105);
  });

  it("alicuota fuera de rango lanza error", () => {
    expect(() => calcularImportes({ lineas: una(1000, 101), facturable: true })).toThrow(
      "La alícuota de IVA debe estar entre 0 y 100."
    );
  });

  it("sin lineas da todo en cero", () => {
    const r = calcularImportes({ lineas: [], facturable: true });
    expect(r.netoBruto).toBe(0);
    expect(r.montoTotal).toBe(0);
    expect(r.desglose).toEqual([]);
  });
});

describe("calcularImportes con varias alícuotas", () => {
  it("agrupa las lineas por alicuota y discrimina el IVA de cada una", () => {
    const r = calcularImportes({
      lineas: [
        { neto: 600, alicuota: 21 },
        { neto: 400, alicuota: 21 },
        { neto: 2000, alicuota: 10.5 },
      ],
      facturable: true,
    });
    expect(r.netoBruto).toBe(3000);
    expect(r.desglose).toEqual([
      { alicuota: 21, netoGravado: 1000, montoIva: 210 },
      { alicuota: 10.5, netoGravado: 2000, montoIva: 210 },
    ]);
    expect(r.montoIva).toBe(420);
    expect(r.montoTotal).toBe(3420);
  });

  it("el descuento por porcentaje se reparte proporcionalmente entre alicuotas", () => {
    const r = calcularImportes({
      lineas: [
        { neto: 1000, alicuota: 21 },
        { neto: 3000, alicuota: 10.5 },
      ],
      tipoDescuento: "PORCENTAJE",
      descuentoPorcentaje: 10,
      facturable: true,
    });
    expect(r.descuentoMonto).toBe(400);
    expect(r.desglose).toEqual([
      { alicuota: 21, netoGravado: 900, montoIva: 189 },
      { alicuota: 10.5, netoGravado: 2700, montoIva: 283.5 },
    ]);
    expect(r.netoGravado).toBe(3600);
    expect(r.montoTotal).toBe(4072.5);
  });

  it("el descuento por equipo se reparte proporcionalmente entre alicuotas", () => {
    const r = calcularImportes({
      lineas: [
        { neto: 1000, alicuota: 21 },
        { neto: 1000, alicuota: 10.5 },
      ],
      tipoDescuento: "EQUIPO",
      descuentoMontoEquipo: 500,
      equipoDescripcion: "Split viejo",
      facturable: true,
    });
    expect(r.desglose).toEqual([
      { alicuota: 21, netoGravado: 750, montoIva: 157.5 },
      { alicuota: 10.5, netoGravado: 750, montoIva: 78.75 },
    ]);
    expect(r.montoTotal).toBe(1736.25);
  });

  it("el redondeo del reparto no pierde centavos: la suma de netos es bruto - descuento", () => {
    const r = calcularImportes({
      lineas: [
        { neto: 100, alicuota: 21 },
        { neto: 100, alicuota: 10.5 },
        { neto: 100, alicuota: 27 },
      ],
      tipoDescuento: "EQUIPO",
      descuentoMontoEquipo: 100,
      equipoDescripcion: "Equipo",
      facturable: true,
    });
    const sumaNetos = r.desglose.reduce((acc, d) => acc + d.netoGravado, 0);
    expect(Math.round(sumaNetos * 100) / 100).toBe(200);
    expect(r.netoGravado).toBe(200);
  });

  it("lineas con cantidades fraccionarias se redondean a centavos por alicuota", () => {
    // 0.333 kg * 100 = 33.3
    const r = calcularImportes({ lineas: [{ neto: 0.333 * 100, alicuota: 21 }], facturable: true });
    expect(r.netoGravado).toBe(33.3);
    expect(r.montoIva).toBe(6.99);
    expect(r.montoTotal).toBe(40.29);
  });
});
