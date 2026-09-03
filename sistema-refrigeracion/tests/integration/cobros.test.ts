import { describe, it, test, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import { registrarCobro, anularCobro, anularFactura, obtenerClientesConDeuda, obtenerDeudaPorCliente } from "@/actions/cobros";
import { crearCliente, crearOrdenFinalizada, crearFacturaEmitida } from "./factories";

async function facturaDeCliente(id_cliente: number, overrides: Parameters<typeof crearFacturaEmitida>[0] = {}) {
  const orden = await crearOrdenFinalizada({ id_cliente });
  return crearFacturaEmitida({ id_orden: orden.id_orden, ...overrides });
}

describe("registrarCobro", () => {
  it("cobro total: PAGADA con saldo 0", async () => {
    const cliente = await crearCliente();
    const factura = await facturaDeCliente(cliente.id_cliente, { monto_total: 1000, saldo_pendiente: 1000 });

    const resultado = await registrarCobro({
      id_cliente: cliente.id_cliente,
      imputaciones: [{ id_factura: factura.id_factura, monto: 1000 }],
    });

    expect(resultado.success).toBe(true);
    const facturaFinal = await prisma.factura.findUnique({ where: { id_factura: factura.id_factura } });
    expect(facturaFinal?.estado_pago).toBe("PAGADA");
    expect(Number(facturaFinal?.saldo_pendiente)).toBe(0);
  });

  it("cobro parcial: PARCIAL con el saldo correcto", async () => {
    const cliente = await crearCliente();
    const factura = await facturaDeCliente(cliente.id_cliente, { monto_total: 1000, saldo_pendiente: 1000 });

    const resultado = await registrarCobro({
      id_cliente: cliente.id_cliente,
      imputaciones: [{ id_factura: factura.id_factura, monto: 400 }],
    });

    expect(resultado.success).toBe(true);
    const facturaFinal = await prisma.factura.findUnique({ where: { id_factura: factura.id_factura } });
    expect(facturaFinal?.estado_pago).toBe("PARCIAL");
    expect(Number(facturaFinal?.saldo_pendiente)).toBe(600);
  });

  it("un recibo imputado a tres facturas del mismo cliente recalcula las tres", async () => {
    const cliente = await crearCliente();
    const f1 = await facturaDeCliente(cliente.id_cliente, { monto_total: 1000, saldo_pendiente: 1000 });
    const f2 = await facturaDeCliente(cliente.id_cliente, { monto_total: 500, saldo_pendiente: 500 });
    const f3 = await facturaDeCliente(cliente.id_cliente, { monto_total: 300, saldo_pendiente: 300 });

    const resultado = await registrarCobro({
      id_cliente: cliente.id_cliente,
      imputaciones: [
        { id_factura: f1.id_factura, monto: 1000 },
        { id_factura: f2.id_factura, monto: 200 },
        { id_factura: f3.id_factura, monto: 300 },
      ],
    });

    expect(resultado.success).toBe(true);
    const [r1, r2, r3] = await Promise.all([
      prisma.factura.findUnique({ where: { id_factura: f1.id_factura } }),
      prisma.factura.findUnique({ where: { id_factura: f2.id_factura } }),
      prisma.factura.findUnique({ where: { id_factura: f3.id_factura } }),
    ]);
    expect(r1?.estado_pago).toBe("PAGADA");
    expect(r2?.estado_pago).toBe("PARCIAL");
    expect(Number(r2?.saldo_pendiente)).toBe(300);
    expect(r3?.estado_pago).toBe("PAGADA");
  });

  it("dos cobros parciales sucesivos terminan en PAGADA", async () => {
    const cliente = await crearCliente();
    const factura = await facturaDeCliente(cliente.id_cliente, { monto_total: 1000, saldo_pendiente: 1000 });

    await registrarCobro({ id_cliente: cliente.id_cliente, imputaciones: [{ id_factura: factura.id_factura, monto: 600 }] });
    const resultado = await registrarCobro({ id_cliente: cliente.id_cliente, imputaciones: [{ id_factura: factura.id_factura, monto: 400 }] });

    expect(resultado.success).toBe(true);
    const facturaFinal = await prisma.factura.findUnique({ where: { id_factura: factura.id_factura } });
    expect(facturaFinal?.estado_pago).toBe("PAGADA");
    expect(Number(facturaFinal?.saldo_pendiente)).toBe(0);
  });

  it("imputar mas que el saldo falla y no crea el recibo", async () => {
    const cliente = await crearCliente();
    const factura = await facturaDeCliente(cliente.id_cliente, { monto_total: 1000, saldo_pendiente: 1000 });

    const resultado = await registrarCobro({
      id_cliente: cliente.id_cliente,
      imputaciones: [{ id_factura: factura.id_factura, monto: 1500 }],
    });

    expect(resultado.success).toBe(false);
    const recibos = await prisma.recibo.count({ where: { id_cliente: cliente.id_cliente } });
    expect(recibos).toBe(0);
  });

  it("imputar a factura de otro cliente falla", async () => {
    const clienteA = await crearCliente();
    const clienteB = await crearCliente();
    const facturaDeB = await facturaDeCliente(clienteB.id_cliente, { monto_total: 1000, saldo_pendiente: 1000 });

    const resultado = await registrarCobro({
      id_cliente: clienteA.id_cliente,
      imputaciones: [{ id_factura: facturaDeB.id_factura, monto: 500 }],
    });

    expect(resultado.success).toBe(false);
  });

  it("imputar a ANULADA falla", async () => {
    const cliente = await crearCliente();
    const factura = await facturaDeCliente(cliente.id_cliente, {
      monto_total: 1000,
      saldo_pendiente: 0,
      estado_pago: "ANULADA",
    });

    const resultado = await registrarCobro({
      id_cliente: cliente.id_cliente,
      imputaciones: [{ id_factura: factura.id_factura, monto: 100 }],
    });

    expect(resultado.success).toBe(false);
  });

  it("imputar a NO_APLICA falla", async () => {
    const cliente = await crearCliente();
    const factura = await facturaDeCliente(cliente.id_cliente, {
      tipo: "Informe Tecnico",
      monto_total: 0,
      saldo_pendiente: 0,
      estado_pago: "NO_APLICA",
    });

    const resultado = await registrarCobro({
      id_cliente: cliente.id_cliente,
      imputaciones: [{ id_factura: factura.id_factura, monto: 100 }],
    });

    expect(resultado.success).toBe(false);
  });

  it("monto 0 falla", async () => {
    const cliente = await crearCliente();
    const factura = await facturaDeCliente(cliente.id_cliente, { monto_total: 1000, saldo_pendiente: 1000 });

    const resultado = await registrarCobro({
      id_cliente: cliente.id_cliente,
      imputaciones: [{ id_factura: factura.id_factura, monto: 0 }],
    });

    expect(resultado.success).toBe(false);
  });

  it("monto negativo falla", async () => {
    const cliente = await crearCliente();
    const factura = await facturaDeCliente(cliente.id_cliente, { monto_total: 1000, saldo_pendiente: 1000 });

    const resultado = await registrarCobro({
      id_cliente: cliente.id_cliente,
      imputaciones: [{ id_factura: factura.id_factura, monto: -100 }],
    });

    expect(resultado.success).toBe(false);
  });

  it("el recibo guarda monto_total igual a la suma de imputaciones", async () => {
    const cliente = await crearCliente();
    const f1 = await facturaDeCliente(cliente.id_cliente, { monto_total: 1000, saldo_pendiente: 1000 });
    const f2 = await facturaDeCliente(cliente.id_cliente, { monto_total: 500, saldo_pendiente: 500 });

    const resultado = await registrarCobro({
      id_cliente: cliente.id_cliente,
      imputaciones: [
        { id_factura: f1.id_factura, monto: 300 },
        { id_factura: f2.id_factura, monto: 200 },
      ],
    });

    expect(resultado.success).toBe(true);
    if (!resultado.success) return;
    expect(Number(resultado.recibo.monto_total)).toBe(500);
  });

  it("las retenciones se persisten con direccion SUFRIDA", async () => {
    const cliente = await crearCliente();
    const factura = await facturaDeCliente(cliente.id_cliente, { monto_total: 1000, saldo_pendiente: 1000 });

    const resultado = await registrarCobro({
      id_cliente: cliente.id_cliente,
      imputaciones: [{ id_factura: factura.id_factura, monto: 900 }],
      retenciones: [{ tipo: "IVA", monto: 100 }],
    });

    expect(resultado.success).toBe(true);
    if (!resultado.success) return;
    const retenciones = await prisma.retencion.findMany({ where: { id_recibo: resultado.recibo.id_recibo } });
    expect(retenciones).toHaveLength(1);
    expect(retenciones[0].direccion).toBe("SUFRIDA");
    expect(retenciones[0].tipo).toBe("IVA");
  });

  it("si una imputacion falla no queda ni recibo ni imputaciones parciales", async () => {
    const cliente = await crearCliente();
    const f1 = await facturaDeCliente(cliente.id_cliente, { monto_total: 1000, saldo_pendiente: 1000 });
    const f2 = await facturaDeCliente(cliente.id_cliente, { monto_total: 500, saldo_pendiente: 500 });

    const resultado = await registrarCobro({
      id_cliente: cliente.id_cliente,
      imputaciones: [
        { id_factura: f1.id_factura, monto: 500 },
        { id_factura: f2.id_factura, monto: 999999 },
      ],
    });

    expect(resultado.success).toBe(false);
    expect(await prisma.recibo.count()).toBe(0);
    expect(await prisma.pagos_parciales.count()).toBe(0);
    const f1Final = await prisma.factura.findUnique({ where: { id_factura: f1.id_factura } });
    expect(Number(f1Final?.saldo_pendiente)).toBe(1000);
  });

  // Bug conocido con issue abierto: no deduplica facturas repetidas dentro de
  // las imputaciones, asi que dos lineas sobre la misma factura pueden
  // superar juntas su saldo pendiente (cada una se valida contra el saldo
  // original, no contra el acumulado ya imputado en el mismo cobro).
  test.fails("dos lineas de imputacion sobre la misma factura no deberian superar su saldo", async () => {
    const cliente = await crearCliente();
    const factura = await facturaDeCliente(cliente.id_cliente, { monto_total: 1000, saldo_pendiente: 1000 });

    const resultado = await registrarCobro({
      id_cliente: cliente.id_cliente,
      imputaciones: [
        { id_factura: factura.id_factura, monto: 700 },
        { id_factura: factura.id_factura, monto: 700 },
      ],
    });

    expect(resultado.success).toBe(false);
  });
});

describe("anularCobro", () => {
  it("las facturas vuelven al saldo y estado previos", async () => {
    const cliente = await crearCliente();
    const factura = await facturaDeCliente(cliente.id_cliente, { monto_total: 1000, saldo_pendiente: 1000 });

    const cobro = await registrarCobro({
      id_cliente: cliente.id_cliente,
      imputaciones: [{ id_factura: factura.id_factura, monto: 400 }],
    });
    expect(cobro.success).toBe(true);
    if (!cobro.success) return;

    const resultado = await anularCobro(cobro.recibo.id_recibo);
    expect(resultado.success).toBe(true);

    const facturaFinal = await prisma.factura.findUnique({ where: { id_factura: factura.id_factura } });
    expect(facturaFinal?.estado_pago).toBe("IMPAGA");
    expect(Number(facturaFinal?.saldo_pendiente)).toBe(1000);
  });

  it("un recibo imputado a varias facturas las recalcula todas al anularlo", async () => {
    const cliente = await crearCliente();
    const f1 = await facturaDeCliente(cliente.id_cliente, { monto_total: 1000, saldo_pendiente: 1000 });
    const f2 = await facturaDeCliente(cliente.id_cliente, { monto_total: 500, saldo_pendiente: 500 });

    const cobro = await registrarCobro({
      id_cliente: cliente.id_cliente,
      imputaciones: [
        { id_factura: f1.id_factura, monto: 1000 },
        { id_factura: f2.id_factura, monto: 500 },
      ],
    });
    expect(cobro.success).toBe(true);
    if (!cobro.success) return;

    await anularCobro(cobro.recibo.id_recibo);

    const [r1, r2] = await Promise.all([
      prisma.factura.findUnique({ where: { id_factura: f1.id_factura } }),
      prisma.factura.findUnique({ where: { id_factura: f2.id_factura } }),
    ]);
    expect(r1?.estado_pago).toBe("IMPAGA");
    expect(Number(r1?.saldo_pendiente)).toBe(1000);
    expect(r2?.estado_pago).toBe("IMPAGA");
    expect(Number(r2?.saldo_pendiente)).toBe(500);
  });

  it("recibo inexistente devuelve error sin romper nada", async () => {
    const resultado = await anularCobro(999999);
    expect(resultado.success).toBe(false);
  });
});

describe("anularFactura", () => {
  it("marca ANULADA con saldo 0", async () => {
    const cliente = await crearCliente();
    const factura = await facturaDeCliente(cliente.id_cliente, { monto_total: 1000, saldo_pendiente: 1000 });

    const resultado = await anularFactura(factura.id_factura);
    expect(resultado.success).toBe(true);

    const facturaFinal = await prisma.factura.findUnique({ where: { id_factura: factura.id_factura } });
    expect(facturaFinal?.estado_pago).toBe("ANULADA");
    expect(Number(facturaFinal?.saldo_pendiente)).toBe(0);
  });

  it("una factura con cobros no se puede anular", async () => {
    const cliente = await crearCliente();
    const factura = await facturaDeCliente(cliente.id_cliente, { monto_total: 1000, saldo_pendiente: 1000 });
    await registrarCobro({ id_cliente: cliente.id_cliente, imputaciones: [{ id_factura: factura.id_factura, monto: 200 }] });

    const resultado = await anularFactura(factura.id_factura);
    expect(resultado.success).toBe(false);
  });
});

describe("obtenerClientesConDeuda y obtenerDeudaPorCliente", () => {
  it("suman solo IMPAGA y PARCIAL, excluyen ANULADA y NO_APLICA", async () => {
    const cliente = await crearCliente();
    await facturaDeCliente(cliente.id_cliente, { monto_total: 1000, saldo_pendiente: 1000, estado_pago: "IMPAGA" });
    await facturaDeCliente(cliente.id_cliente, { monto_total: 500, saldo_pendiente: 200, estado_pago: "PARCIAL" });
    await facturaDeCliente(cliente.id_cliente, { monto_total: 300, saldo_pendiente: 0, estado_pago: "ANULADA" });
    await facturaDeCliente(cliente.id_cliente, {
      tipo: "Informe Tecnico",
      monto_total: 0,
      saldo_pendiente: 0,
      estado_pago: "NO_APLICA",
    });

    const deuda = await obtenerDeudaPorCliente(cliente.id_cliente);
    expect(deuda).toBe(1200);

    const clientesConDeuda = await obtenerClientesConDeuda();
    const fila = clientesConDeuda.find((c: { id_cliente: number }) => c.id_cliente === cliente.id_cliente);
    expect(fila?.saldo).toBe(1200);
  });

  it("cliente sin deuda no aparece", async () => {
    const cliente = await crearCliente();
    await facturaDeCliente(cliente.id_cliente, { monto_total: 1000, saldo_pendiente: 0, estado_pago: "PAGADA" });

    const clientesConDeuda = await obtenerClientesConDeuda();
    expect(clientesConDeuda.find((c: { id_cliente: number }) => c.id_cliente === cliente.id_cliente)).toBeUndefined();

    const deuda = await obtenerDeudaPorCliente(cliente.id_cliente);
    expect(deuda).toBe(0);
  });

  it("orden de mayor a menor", async () => {
    const clienteBajo = await crearCliente({ nombre: "Bajo" });
    const clienteAlto = await crearCliente({ nombre: "Alto" });
    await facturaDeCliente(clienteBajo.id_cliente, { monto_total: 100, saldo_pendiente: 100, estado_pago: "IMPAGA" });
    await facturaDeCliente(clienteAlto.id_cliente, { monto_total: 5000, saldo_pendiente: 5000, estado_pago: "IMPAGA" });

    const clientesConDeuda = await obtenerClientesConDeuda();
    const idxAlto = clientesConDeuda.findIndex((c: { id_cliente: number }) => c.id_cliente === clienteAlto.id_cliente);
    const idxBajo = clientesConDeuda.findIndex((c: { id_cliente: number }) => c.id_cliente === clienteBajo.id_cliente);
    expect(idxAlto).toBeLessThan(idxBajo);
  });
});
