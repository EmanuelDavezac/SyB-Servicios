import { describe, it, test, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import { crearFactura, getOrdenesPendientesFacturacion } from "@/actions/facturacion";
import { crearCliente, crearInsumo, crearOrdenFinalizada } from "./factories";

describe("crearFactura", () => {
  it("factura sobre orden finalizada: IMPAGA, saldo igual al total, neto y alicuota guardados", async () => {
    const orden = await crearOrdenFinalizada();

    const resultado = await crearFactura({
      id_orden: orden.id_orden,
      num_factura: "F-1",
      tipo: "Factura",
      neto: 1000,
      alicuota_iva: 21,
    });

    expect(resultado.success).toBe(true);
    if (!resultado.success) return;
    expect(resultado.factura.estado_pago).toBe("IMPAGA");
    expect(resultado.factura.saldo_pendiente).toBe(resultado.factura.monto_total);
    expect(Number(resultado.factura.neto)).toBe(1000);
    expect(Number(resultado.factura.alicuota_iva)).toBe(21);
    expect(Number(resultado.factura.monto_total)).toBe(1210);
  });

  it("la misma orden dos veces: la segunda falla y no descuenta stock de nuevo", async () => {
    const insumo = await crearInsumo({ stock_actual: 10 });
    const orden = await crearOrdenFinalizada({ insumos: [{ id_insumo: insumo.id_insumo, cantidad_usada: 1 }] });

    const primera = await crearFactura({
      id_orden: orden.id_orden,
      num_factura: "F-1",
      tipo: "Factura",
      neto: 1000,
      alicuota_iva: 21,
    });
    expect(primera.success).toBe(true);

    const segunda = await crearFactura({
      id_orden: orden.id_orden,
      num_factura: "F-2",
      tipo: "Factura",
      neto: 1000,
      alicuota_iva: 21,
    });
    expect(segunda.success).toBe(false);
    if (segunda.success) return;
    expect(segunda.error).toContain("ya tiene una factura registrada");

    const insumoFinal = await prisma.insumo.findUnique({ where: { id_insumo: insumo.id_insumo } });
    expect(Number(insumoFinal?.stock_actual)).toBe(9);
  });

  it("reintento tras un error: la transaccion revirtio todo, el stock no quedo descontado a medias", async () => {
    const insumo = await crearInsumo({ stock_actual: 10 });
    const orden = await crearOrdenFinalizada({ insumos: [{ id_insumo: insumo.id_insumo, cantidad_usada: 2 }] });

    const resultado = await crearFactura({
      id_orden: orden.id_orden,
      num_factura: "F-1",
      tipo: "Factura",
      neto: 1000,
      alicuota_iva: 21,
      insumos: [{ id_insumo: 999999, cantidad: 1 }],
    });

    expect(resultado.success).toBe(false);

    const insumoFinal = await prisma.insumo.findUnique({ where: { id_insumo: insumo.id_insumo } });
    expect(Number(insumoFinal?.stock_actual)).toBe(10);

    const facturaCreada = await prisma.factura.findFirst({ where: { id_orden: orden.id_orden } });
    expect(facturaCreada).toBeNull();
  });

  it("descuenta el stock de los insumos de detalle_orden_insumo", async () => {
    const insumo = await crearInsumo({ stock_actual: 10 });
    const orden = await crearOrdenFinalizada({ insumos: [{ id_insumo: insumo.id_insumo, cantidad_usada: 3 }] });

    await crearFactura({
      id_orden: orden.id_orden,
      num_factura: "F-1",
      tipo: "Factura",
      neto: 1000,
      alicuota_iva: 21,
    });

    const insumoFinal = await prisma.insumo.findUnique({ where: { id_insumo: insumo.id_insumo } });
    expect(Number(insumoFinal?.stock_actual)).toBe(7);
  });

  it("insumos adicionales del payload que ya estan en la orden no se descuentan dos veces", async () => {
    const insumo = await crearInsumo({ stock_actual: 10 });
    const orden = await crearOrdenFinalizada({ insumos: [{ id_insumo: insumo.id_insumo, cantidad_usada: 2 }] });

    const resultado = await crearFactura({
      id_orden: orden.id_orden,
      num_factura: "F-1",
      tipo: "Factura",
      neto: 1000,
      alicuota_iva: 21,
      insumos: [{ id_insumo: insumo.id_insumo, cantidad: 5 }],
    });

    expect(resultado.success).toBe(true);
    const insumoFinal = await prisma.insumo.findUnique({ where: { id_insumo: insumo.id_insumo } });
    expect(Number(insumoFinal?.stock_actual)).toBe(8);
  });

  it("comprobante no facturable: monto 0, saldo 0, estado NO_APLICA", async () => {
    const orden = await crearOrdenFinalizada();

    const resultado = await crearFactura({
      id_orden: orden.id_orden,
      num_factura: "IT-1",
      tipo: "Informe Tecnico",
      neto: 1000,
      alicuota_iva: 21,
    });

    expect(resultado.success).toBe(true);
    if (!resultado.success) return;
    expect(Number(resultado.factura.monto_total)).toBe(0);
    expect(Number(resultado.factura.saldo_pendiente)).toBe(0);
    expect(resultado.factura.estado_pago).toBe("NO_APLICA");
  });

  it("sin vencimiento explicito lo calcula como emision mas condicion_pago_dias", async () => {
    const cliente = await crearCliente({ condicion_pago_dias: 15 });
    const orden = await crearOrdenFinalizada({ id_cliente: cliente.id_cliente });

    const resultado = await crearFactura({
      id_orden: orden.id_orden,
      num_factura: "F-1",
      tipo: "Factura",
      neto: 1000,
      alicuota_iva: 21,
    });

    expect(resultado.success).toBe(true);
    if (!resultado.success) return;
    const emision = new Date(resultado.factura.fecha_emision);
    const vencimientoEsperado = new Date(emision);
    vencimientoEsperado.setDate(vencimientoEsperado.getDate() + 15);
    const vencimiento = new Date(resultado.factura.fecha_vencimiento);
    expect(vencimiento.toISOString().slice(0, 10)).toBe(vencimientoEsperado.toISOString().slice(0, 10));
  });

  it("con vencimiento explicito respeta el cargado", async () => {
    const orden = await crearOrdenFinalizada();
    const vencimiento = new Date("2027-05-20");

    const resultado = await crearFactura({
      id_orden: orden.id_orden,
      num_factura: "F-1",
      tipo: "Factura",
      neto: 1000,
      alicuota_iva: 21,
      fecha_vencimiento: vencimiento,
    });

    expect(resultado.success).toBe(true);
    if (!resultado.success) return;
    expect(new Date(resultado.factura.fecha_vencimiento).toISOString().slice(0, 10)).toBe("2027-05-20");
  });

  it("descuento por porcentaje persistido en las columnas correctas", async () => {
    const orden = await crearOrdenFinalizada();

    const resultado = await crearFactura({
      id_orden: orden.id_orden,
      num_factura: "F-1",
      tipo: "Factura",
      neto: 1000,
      alicuota_iva: 21,
      tipo_descuento: "PORCENTAJE",
      descuento_porcentaje: 10,
    });

    expect(resultado.success).toBe(true);
    if (!resultado.success) return;
    expect(resultado.factura.tipo_descuento).toBe("PORCENTAJE");
    expect(Number(resultado.factura.descuento_porcentaje)).toBe(10);
    expect(Number(resultado.factura.descuento_monto)).toBe(100);
    expect(Number(resultado.factura.neto)).toBe(900);
    expect(resultado.factura.equipo_descripcion).toBeNull();
  });

  it("descuento por equipo persistido en las columnas correctas", async () => {
    const orden = await crearOrdenFinalizada();

    const resultado = await crearFactura({
      id_orden: orden.id_orden,
      num_factura: "F-1",
      tipo: "Factura",
      neto: 1000,
      alicuota_iva: 21,
      tipo_descuento: "EQUIPO",
      descuento_monto_equipo: 300,
      equipo_descripcion: "Heladera vieja",
    });

    expect(resultado.success).toBe(true);
    if (!resultado.success) return;
    expect(resultado.factura.tipo_descuento).toBe("EQUIPO");
    expect(resultado.factura.descuento_porcentaje).toBeNull();
    expect(Number(resultado.factura.descuento_monto)).toBe(300);
    expect(Number(resultado.factura.neto)).toBe(700);
    expect(resultado.factura.equipo_descripcion).toBe("Heladera vieja");
  });

  // Bug conocido con issue abierto: crearFactura descuenta stock incluso para
  // comprobantes no facturables (Informe Tecnico), que no deberian tocar stock.
  test.fails("comprobante no facturable no deberia descontar stock", async () => {
    const insumo = await crearInsumo({ stock_actual: 10 });
    const orden = await crearOrdenFinalizada({ insumos: [{ id_insumo: insumo.id_insumo, cantidad_usada: 2 }] });

    await crearFactura({
      id_orden: orden.id_orden,
      num_factura: "IT-1",
      tipo: "Informe Tecnico",
      neto: 1000,
      alicuota_iva: 21,
    });

    const insumoFinal = await prisma.insumo.findUnique({ where: { id_insumo: insumo.id_insumo } });
    expect(Number(insumoFinal?.stock_actual)).toBe(10);
  });

  // Bug conocido con issue abierto: no valida stock suficiente antes de
  // descontar, dejando stock_actual negativo.
  test.fails("stock insuficiente deberia rechazar la factura", async () => {
    const insumo = await crearInsumo({ stock_actual: 1 });
    const orden = await crearOrdenFinalizada({ insumos: [{ id_insumo: insumo.id_insumo, cantidad_usada: 5 }] });

    const resultado = await crearFactura({
      id_orden: orden.id_orden,
      num_factura: "F-1",
      tipo: "Factura",
      neto: 1000,
      alicuota_iva: 21,
    });

    expect(resultado.success).toBe(false);
  });

  // Bug conocido con issue abierto: crearFactura no pasa la orden a estado
  // "Facturada" (queda en "Finalizado").
  test.fails("crearFactura deberia pasar la orden a estado Facturada", async () => {
    const orden = await crearOrdenFinalizada();

    await crearFactura({
      id_orden: orden.id_orden,
      num_factura: "F-1",
      tipo: "Factura",
      neto: 1000,
      alicuota_iva: 21,
    });

    const ordenFinal = await prisma.orden_trabajo.findUnique({ where: { id_orden: orden.id_orden } });
    expect(ordenFinal?.estado_trabajo).toBe("Facturada");
  });

  // Bug conocido con issue abierto: el tipo "Remito" es facturable y genera
  // deuda del cliente, aunque documenta una entrega, no una venta.
  test.fails("el Remito no deberia generar deuda del cliente", async () => {
    const orden = await crearOrdenFinalizada();

    const resultado = await crearFactura({
      id_orden: orden.id_orden,
      num_factura: "R-1",
      tipo: "Remito",
      neto: 1000,
      alicuota_iva: 21,
    });

    expect(resultado.success).toBe(true);
    if (!resultado.success) return;
    expect(resultado.factura.estado_pago).toBe("NO_APLICA");
    expect(Number(resultado.factura.saldo_pendiente)).toBe(0);
  });
});

describe("getOrdenesPendientesFacturacion", () => {
  it("trae finalizadas sin comprobante, no trae pendientes ni en proceso, no trae las ya facturadas", async () => {
    const finalizadaSinFactura = await crearOrdenFinalizada({ estado_trabajo: "Finalizado" });
    await crearOrdenFinalizada({ estado_trabajo: "Pendiente" });
    await crearOrdenFinalizada({ estado_trabajo: "En proceso" });
    const finalizadaConFactura = await crearOrdenFinalizada({ estado_trabajo: "Finalizado" });
    await crearFactura({
      id_orden: finalizadaConFactura.id_orden,
      num_factura: "F-1",
      tipo: "Factura",
      neto: 1000,
      alicuota_iva: 21,
    });

    const pendientes = await getOrdenesPendientesFacturacion();
    const ids = pendientes.map((o: { id_orden: number }) => o.id_orden);

    expect(ids).toContain(finalizadaSinFactura.id_orden);
    expect(ids).not.toContain(finalizadaConFactura.id_orden);
    expect(pendientes.every((o: { id_orden: number }) => o.id_orden !== finalizadaConFactura.id_orden)).toBe(true);
    expect(pendientes.length).toBe(1);
  });
});
