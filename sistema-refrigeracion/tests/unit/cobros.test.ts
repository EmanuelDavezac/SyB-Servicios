import { describe, it, expect } from "vitest";
import { distribuirCobro } from "@/lib/cobros";

const comprobantes = [
  { id_comprobante: 1, saldo_pendiente: 500 },
  { id_comprobante: 2, saldo_pendiente: 300 },
  { id_comprobante: 3, saldo_pendiente: 200 },
];

describe("distribuirCobro", () => {
  it("reparte del comprobante mas antigua a la mas reciente", () => {
    const r = distribuirCobro(comprobantes, 700);
    expect(r).toEqual({ 1: "500.00", 2: "200.00" });
  });

  it("monto exacto igual a la deuda total cubre todo sin resto", () => {
    const r = distribuirCobro(comprobantes, 1000);
    expect(r).toEqual({ 1: "500.00", 2: "300.00", 3: "200.00" });
  });

  it("monto mayor a la deuda total: el excedente se descarta", () => {
    const r = distribuirCobro(comprobantes, 1500);
    expect(r).toEqual({ 1: "500.00", 2: "300.00", 3: "200.00" });
  });

  it("monto menor al saldo de la primera comprobante: una sola imputacion parcial", () => {
    const r = distribuirCobro(comprobantes, 200);
    expect(r).toEqual({ 1: "200.00" });
  });

  it("monto que cubre la primera y parte de la segunda", () => {
    const r = distribuirCobro(comprobantes, 600);
    expect(r).toEqual({ 1: "500.00", 2: "100.00" });
  });

  it("monto 0: ninguna imputacion", () => {
    expect(distribuirCobro(comprobantes, 0)).toEqual({});
  });

  it("monto negativo: ninguna imputacion", () => {
    expect(distribuirCobro(comprobantes, -100)).toEqual({});
  });

  it("lista de comprobantes vacia devuelve vacio", () => {
    expect(distribuirCobro([], 500)).toEqual({});
  });

  it("saldos con decimales: la suma de las imputaciones no pierde centavos", () => {
    const conDecimales = [
      { id_comprobante: 1, saldo_pendiente: 100.33 },
      { id_comprobante: 2, saldo_pendiente: 50.67 },
    ];
    const r = distribuirCobro(conDecimales, 151);
    expect(r).toEqual({ 1: "100.33", 2: "50.67" });
    const suma = Object.values(r).reduce((acc, v) => acc + parseFloat(v), 0);
    expect(suma).toBeCloseTo(151, 2);
  });
});
