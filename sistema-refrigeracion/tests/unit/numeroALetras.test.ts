import { describe, it, expect } from "vitest";
import { montoALetras } from "@/lib/numeroALetras";

describe("montoALetras", () => {
  it("0", () => {
    expect(montoALetras(0)).toBe("SON PESOS CERO CON 00/100");
  });

  it("1", () => {
    expect(montoALetras(1)).toBe("SON PESOS UN CON 00/100");
  });

  it("21", () => {
    expect(montoALetras(21)).toBe("SON PESOS VEINTIÚN CON 00/100");
  });

  it("100", () => {
    expect(montoALetras(100)).toBe("SON PESOS CIEN CON 00/100");
  });

  it("101", () => {
    expect(montoALetras(101)).toBe("SON PESOS CIENTO UN CON 00/100");
  });

  it("1000", () => {
    expect(montoALetras(1000)).toBe("SON PESOS MIL CON 00/100");
  });

  it("1000000", () => {
    expect(montoALetras(1000000)).toBe("SON PESOS UN MILLÓN CON 00/100");
  });

  describe("irregularidades del español", () => {
    it("500", () => {
      expect(montoALetras(500)).toBe("SON PESOS QUINIENTOS CON 00/100");
    });

    it("700", () => {
      expect(montoALetras(700)).toBe("SON PESOS SETECIENTOS CON 00/100");
    });

    it("900", () => {
      expect(montoALetras(900)).toBe("SON PESOS NOVECIENTOS CON 00/100");
    });

    it("15", () => {
      expect(montoALetras(15)).toBe("SON PESOS QUINCE CON 00/100");
    });

    it("16", () => {
      expect(montoALetras(16)).toBe("SON PESOS DIECISEIS CON 00/100");
    });

    it("22", () => {
      expect(montoALetras(22)).toBe("SON PESOS VEINTIDOS CON 00/100");
    });

    it("30", () => {
      expect(montoALetras(30)).toBe("SON PESOS TREINTA CON 00/100");
    });
  });

  describe("centavos", () => {
    it("1234.56", () => {
      expect(montoALetras(1234.56)).toBe("SON PESOS MIL DOSCIENTOS TREINTA Y CUATRO CON 56/100");
    });

    it("0.05", () => {
      expect(montoALetras(0.05)).toBe("SON PESOS CERO CON 05/100");
    });

    it("0.99", () => {
      expect(montoALetras(0.99)).toBe("SON PESOS CERO CON 99/100");
    });
  });

  describe("redondeo", () => {
    it("1234.567 redondea centavos a 57", () => {
      expect(montoALetras(1234.567)).toBe("SON PESOS MIL DOSCIENTOS TREINTA Y CUATRO CON 57/100");
    });

    it("1234.564 redondea centavos a 56", () => {
      expect(montoALetras(1234.564)).toBe("SON PESOS MIL DOSCIENTOS TREINTA Y CUATRO CON 56/100");
    });
  });

  it("monto grande realista 1234567.89", () => {
    expect(montoALetras(1234567.89)).toBe(
      "SON PESOS UN MILLÓN DOSCIENTOS TREINTA Y CUATRO MIL QUINIENTOS SESENTA Y SIETE CON 89/100"
    );
  });

  it("negativo: comportamiento actual documentado", () => {
    // Math.floor con dividendo negativo empuja millones/miles/cientos a -1 o
    // menos, y como numeroEnteroALetras solo agrega texto cuando el grupo es
    // > 0, un monto negativo entero produce string vacio (sin "menos" ni signo).
    expect(montoALetras(-100)).toBe("SON PESOS  CON 00/100");
  });
});
