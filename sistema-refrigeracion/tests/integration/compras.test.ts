import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import { crearCompra, eliminarCompra } from "@/actions/compras";
import { crearInsumo, crearProveedor } from "./factories";

describe("crearCompra", () => {
  it("suma stock de cada insumo del detalle", async () => {
    const insumoA = await crearInsumo({ stock_actual: 5 });
    const insumoB = await crearInsumo({ stock_actual: 10 });

    const resultado = await crearCompra({
      alicuota_iva: 21,
      insumos: [
        { id_insumo: insumoA.id_insumo, cantidad: 3, precio_unitario: 100 },
        { id_insumo: insumoB.id_insumo, cantidad: 2, precio_unitario: 50 },
      ],
    });

    expect(resultado.success).toBe(true);
    const [finalA, finalB] = await Promise.all([
      prisma.insumo.findUnique({ where: { id_insumo: insumoA.id_insumo } }),
      prisma.insumo.findUnique({ where: { id_insumo: insumoB.id_insumo } }),
    ]);
    expect(Number(finalA?.stock_actual)).toBe(8);
    expect(Number(finalB?.stock_actual)).toBe(12);
  });

  it("calcula costo_total como neto mas IVA y guarda neto y alicuota_iva", async () => {
    const insumo = await crearInsumo();
    const proveedor = await crearProveedor();

    const resultado = await crearCompra({
      id_proveedor: proveedor.id_proveedor,
      alicuota_iva: 21,
      insumos: [{ id_insumo: insumo.id_insumo, cantidad: 4, precio_unitario: 250 }],
    });

    expect(resultado.success).toBe(true);
    if (!resultado.success) return;
    expect(Number(resultado.compra.neto)).toBe(1000);
    expect(Number(resultado.compra.alicuota_iva)).toBe(21);
    expect(Number(resultado.compra.costo_total)).toBe(1210);
  });

  it("compra sin insumos falla", async () => {
    const resultado = await crearCompra({ alicuota_iva: 21, insumos: [] });
    expect(resultado.success).toBe(false);
  });

  it("cantidad en cero falla", async () => {
    const insumo = await crearInsumo();
    const resultado = await crearCompra({
      alicuota_iva: 21,
      insumos: [{ id_insumo: insumo.id_insumo, cantidad: 0, precio_unitario: 100 }],
    });
    expect(resultado.success).toBe(false);
  });

  it("cantidad negativa falla", async () => {
    const insumo = await crearInsumo();
    const resultado = await crearCompra({
      alicuota_iva: 21,
      insumos: [{ id_insumo: insumo.id_insumo, cantidad: -1, precio_unitario: 100 }],
    });
    expect(resultado.success).toBe(false);
  });

  it("precio en cero falla", async () => {
    const insumo = await crearInsumo();
    const resultado = await crearCompra({
      alicuota_iva: 21,
      insumos: [{ id_insumo: insumo.id_insumo, cantidad: 1, precio_unitario: 0 }],
    });
    expect(resultado.success).toBe(false);
  });

  it("precio negativo falla", async () => {
    const insumo = await crearInsumo();
    const resultado = await crearCompra({
      alicuota_iva: 21,
      insumos: [{ id_insumo: insumo.id_insumo, cantidad: 1, precio_unitario: -50 }],
    });
    expect(resultado.success).toBe(false);
  });
});

describe("eliminarCompra", () => {
  it("devuelve el stock exactamente a como estaba", async () => {
    const insumo = await crearInsumo({ stock_actual: 5 });

    const compra = await crearCompra({
      alicuota_iva: 21,
      insumos: [{ id_insumo: insumo.id_insumo, cantidad: 3, precio_unitario: 100 }],
    });
    expect(compra.success).toBe(true);
    if (!compra.success) return;

    const trasCompra = await prisma.insumo.findUnique({ where: { id_insumo: insumo.id_insumo } });
    expect(Number(trasCompra?.stock_actual)).toBe(8);

    const resultado = await eliminarCompra(compra.compra.id_compra);
    expect(resultado.success).toBe(true);

    const trasEliminar = await prisma.insumo.findUnique({ where: { id_insumo: insumo.id_insumo } });
    expect(Number(trasEliminar?.stock_actual)).toBe(5);
  });
});

describe("crearCompra - valores numericos invalidos", () => {
  it.each([
    ["cantidad negativa", { cantidad: -3, precio_unitario: 100 }],
    ["cantidad NaN", { cantidad: NaN, precio_unitario: 100 }],
    ["cantidad Infinity", { cantidad: Infinity, precio_unitario: 100 }],
    ["precio negativo", { cantidad: 3, precio_unitario: -100 }],
    ["precio NaN", { cantidad: 3, precio_unitario: NaN }],
    ["precio Infinity", { cantidad: 3, precio_unitario: Infinity }],
  ])("%s falla y no toca stock ni crea la compra", async (_nombre, linea) => {
    const insumo = await crearInsumo({ stock_actual: 5 });

    const resultado = await crearCompra({
      alicuota_iva: 21,
      insumos: [{ id_insumo: insumo.id_insumo, ...linea }],
    });

    expect(resultado.success).toBe(false);
    const insumoFinal = await prisma.insumo.findUnique({ where: { id_insumo: insumo.id_insumo } });
    expect(Number(insumoFinal?.stock_actual)).toBe(5);
    expect(await prisma.compra_insumo.count()).toBe(0);
  });

  it.each([
    ["alicuota NaN", NaN],
    ["alicuota Infinity", Infinity],
    ["alicuota negativa", -1],
    ["alicuota mayor a 100", 101],
  ])("%s falla y no toca stock ni crea la compra", async (_nombre, alicuota_iva) => {
    const insumo = await crearInsumo({ stock_actual: 5 });

    const resultado = await crearCompra({
      alicuota_iva,
      insumos: [{ id_insumo: insumo.id_insumo, cantidad: 3, precio_unitario: 100 }],
    });

    expect(resultado.success).toBe(false);
    const insumoFinal = await prisma.insumo.findUnique({ where: { id_insumo: insumo.id_insumo } });
    expect(Number(insumoFinal?.stock_actual)).toBe(5);
    expect(await prisma.compra_insumo.count()).toBe(0);
  });
});
