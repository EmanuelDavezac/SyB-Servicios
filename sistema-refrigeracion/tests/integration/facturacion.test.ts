import { describe, it, test, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import { crearFactura, getOrdenesPendientesFacturacion } from "@/actions/facturacion";
import { anularFactura } from "@/actions/cobros";
import { crearCliente, crearInsumo, crearOrdenFinalizada } from "./factories";

describe("crearFactura", () => {
  it("factura sobre orden finalizada: IMPAGA, saldo igual al total, neto y alicuota guardados", async () => {
    const orden = await crearOrdenFinalizada({ insumos: [] });

    const resultado = await crearFactura({
      id_orden: orden.id_orden,
      num_factura: "F-1",
      tipo: "Factura",
      fiscal: true,
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
      fiscal: true,
    });
    expect(primera.success).toBe(true);

    const segunda = await crearFactura({
      id_orden: orden.id_orden,
      num_factura: "F-2",
      tipo: "Factura",
      fiscal: true,
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
      fiscal: true,
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
      fiscal: true,
    });

    const insumoFinal = await prisma.insumo.findUnique({ where: { id_insumo: insumo.id_insumo } });
    expect(Number(insumoFinal?.stock_actual)).toBe(7);
  });

  it("insumos adicionales del payload que ya estan en la orden se descuentan extra", async () => {
    const insumo = await crearInsumo({ stock_actual: 10 });
    const orden = await crearOrdenFinalizada({ insumos: [{ id_insumo: insumo.id_insumo, cantidad_usada: 2 }] });

    const resultado = await crearFactura({
      id_orden: orden.id_orden,
      num_factura: "F-1",
      tipo: "Factura",
      fiscal: true,
      insumos: [{ id_insumo: insumo.id_insumo, cantidad: 5 }],
    });

    expect(resultado.success).toBe(true);
    const insumoFinal = await prisma.insumo.findUnique({ where: { id_insumo: insumo.id_insumo } });
    // 10 inicial - 2 de la orden = 8. Luego - 5 adicionales en factura = 3
    expect(Number(insumoFinal?.stock_actual)).toBe(3);
  });

  it("comprobante no facturable: monto 0, saldo 0, estado NO_APLICA", async () => {
    const orden = await crearOrdenFinalizada();

    const resultado = await crearFactura({
      id_orden: orden.id_orden,
      num_factura: "IT-1",
      tipo: "Informe Tecnico",
      fiscal: true,
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
      fiscal: true,
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
      fiscal: true,
      fecha_vencimiento: vencimiento,
    });

    expect(resultado.success).toBe(true);
    if (!resultado.success) return;
    expect(new Date(resultado.factura.fecha_vencimiento).toISOString().slice(0, 10)).toBe("2027-05-20");
  });

  it("descuento por porcentaje persistido en las columnas correctas", async () => {
    const orden = await crearOrdenFinalizada({ insumos: [] });

    const resultado = await crearFactura({
      id_orden: orden.id_orden,
      num_factura: "F-1",
      tipo: "Factura",
      fiscal: true,
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
    const orden = await crearOrdenFinalizada({ insumos: [] });

    const resultado = await crearFactura({
      id_orden: orden.id_orden,
      num_factura: "F-1",
      tipo: "Factura",
      fiscal: true,
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

  it("calcula los importes en el servidor a partir de las lineas de la orden y discrimina el IVA", async () => {
    const orden = await crearOrdenFinalizada({
      servicios: [{ precio_acordado: 1000, alicuota_iva: 21 }],
      insumos: [{ cantidad_usada: 0.5, precio_aplicado: 400, alicuota_iva: 10.5 }],
    });

    const resultado = await crearFactura({
      id_orden: orden.id_orden,
      num_factura: "F-1",
      tipo: "Factura",
      fiscal: true,
    });

    expect(resultado.success).toBe(true);
    if (!resultado.success) return;
    expect(Number(resultado.factura.neto)).toBe(1200);
    // varias alicuotas: no hay alicuota unica en la factura
    expect(resultado.factura.alicuota_iva).toBeNull();
    expect(Number(resultado.factura.monto_total)).toBe(1200 + 210 + 21);

    const iva = await prisma.factura_iva.findMany({
      where: { id_factura: resultado.factura.id_factura },
      orderBy: { alicuota: "desc" },
    });
    expect(iva.map((i) => [Number(i.alicuota), Number(i.neto_gravado), Number(i.monto_iva)])).toEqual([
      [21, 1000, 210],
      [10.5, 200, 21],
    ]);
  });

  it("el descuento se reparte entre alicuotas en factura_iva", async () => {
    const orden = await crearOrdenFinalizada({
      servicios: [{ precio_acordado: 1000, alicuota_iva: 21 }, { precio_acordado: 1000, alicuota_iva: 10.5 }],
      insumos: [],
    });

    const resultado = await crearFactura({
      id_orden: orden.id_orden,
      num_factura: "F-1",
      tipo: "Factura",
      fiscal: true,
      tipo_descuento: "PORCENTAJE",
      descuento_porcentaje: 10,
    });

    expect(resultado.success).toBe(true);
    if (!resultado.success) return;
    expect(Number(resultado.factura.descuento_monto)).toBe(200);
    expect(Number(resultado.factura.neto)).toBe(1800);
    expect(Number(resultado.factura.monto_total)).toBe(1800 + 189 + 94.5);
  });

  it("factura interna: se guarda con fiscal false, genera deuda y el IVA se calcula igual", async () => {
    const orden = await crearOrdenFinalizada({ insumos: [] });

    const resultado = await crearFactura({
      id_orden: orden.id_orden,
      num_factura: "Factura X-0001",
      tipo: "Factura",
      fiscal: false,
      punto_venta: 3,
    });

    expect(resultado.success).toBe(true);
    if (!resultado.success) return;
    expect(resultado.factura.fiscal).toBe(false);
    expect(resultado.factura.estado_pago).toBe("IMPAGA");
    expect(Number(resultado.factura.monto_total)).toBe(1210);
    expect(Number(resultado.factura.saldo_pendiente)).toBe(1210);
    // una interna no guarda punto de venta
    expect(resultado.factura.punto_venta).toBeNull();
  });

  it("factura fiscal guarda punto de venta", async () => {
    const orden = await crearOrdenFinalizada({ insumos: [] });

    const resultado = await crearFactura({
      id_orden: orden.id_orden,
      num_factura: "Factura A-0001",
      tipo: "Factura",
      fiscal: true,
      punto_venta: 3,
    });

    expect(resultado.success).toBe(true);
    if (!resultado.success) return;
    expect(resultado.factura.fiscal).toBe(true);
    expect(resultado.factura.punto_venta).toBe(3);
  });

  it("punto de venta invalido rechaza la factura", async () => {
    const orden = await crearOrdenFinalizada({ insumos: [] });

    const resultado = await crearFactura({
      id_orden: orden.id_orden,
      num_factura: "F-1",
      tipo: "Factura",
      fiscal: true,
      punto_venta: 0,
    });

    expect(resultado.success).toBe(false);
    if (resultado.success) return;
    expect(resultado.error).toContain("punto de venta");
  });

  it("un remito queda siempre fiscal aunque se mande fiscal false", async () => {
    const orden = await crearOrdenFinalizada();

    const resultado = await crearFactura({
      id_orden: orden.id_orden,
      num_factura: "R-1",
      tipo: "Remito",
      fiscal: false,
    });

    expect(resultado.success).toBe(true);
    if (!resultado.success) return;
    expect(resultado.factura.fiscal).toBe(true);
  });

  it("insumos adicionales se registran con su alicuota y entran en el calculo", async () => {
    const insumo = await crearInsumo({ stock_actual: 10, precio_venta: 100 });
    const orden = await crearOrdenFinalizada({ insumos: [] });

    const resultado = await crearFactura({
      id_orden: orden.id_orden,
      num_factura: "F-1",
      tipo: "Factura",
      fiscal: true,
      insumos: [{ id_insumo: insumo.id_insumo, cantidad: 2, alicuota_iva: 10.5 }],
    });

    expect(resultado.success).toBe(true);
    if (!resultado.success) return;
    expect(Number(resultado.factura.neto)).toBe(1200);
    expect(Number(resultado.factura.monto_total)).toBe(1200 + 210 + 21);
    const detalle = await prisma.detalle_orden_insumo.findFirst({ where: { id_orden: orden.id_orden } });
    expect(Number(detalle?.alicuota_iva)).toBe(10.5);
  });

  it("orden sin lineas con precio no se puede facturar", async () => {
    const orden = await crearOrdenFinalizada({ servicios: [], insumos: [] });

    const resultado = await crearFactura({
      id_orden: orden.id_orden,
      num_factura: "F-1",
      tipo: "Factura",
      fiscal: true,
    });

    expect(resultado.success).toBe(false);
  });

  it("comprobante no facturable no descuenta stock", async () => {
    const insumo = await crearInsumo({ stock_actual: 10 });
    const orden = await crearOrdenFinalizada({ insumos: [{ id_insumo: insumo.id_insumo, cantidad_usada: 2 }] });

    await crearFactura({
      id_orden: orden.id_orden,
      num_factura: "IT-1",
      tipo: "Informe Tecnico",
      fiscal: true,
    });

    const insumoFinal = await prisma.insumo.findUnique({ where: { id_insumo: insumo.id_insumo } });
    expect(Number(insumoFinal?.stock_actual)).toBe(10);
  });

  it("remito y despues factura en la misma orden: ambos se emiten y el stock se descuenta una sola vez", async () => {
    const insumo = await crearInsumo({ stock_actual: 10 });
    const orden = await crearOrdenFinalizada({ insumos: [{ id_insumo: insumo.id_insumo, cantidad_usada: 3 }] });

    const remito = await crearFactura({ id_orden: orden.id_orden, num_factura: "R-1", tipo: "Remito", fiscal: true });
    expect(remito.success).toBe(true);
    const trasRemito = await prisma.insumo.findUnique({ where: { id_insumo: insumo.id_insumo } });
    expect(Number(trasRemito?.stock_actual)).toBe(10);

    const factura = await crearFactura({ id_orden: orden.id_orden, num_factura: "F-1", tipo: "Factura", fiscal: true });
    expect(factura.success).toBe(true);
    const trasFactura = await prisma.insumo.findUnique({ where: { id_insumo: insumo.id_insumo } });
    expect(Number(trasFactura?.stock_actual)).toBe(7);
  });

  it("remito despues de la factura se permite", async () => {
    const orden = await crearOrdenFinalizada();

    const factura = await crearFactura({ id_orden: orden.id_orden, num_factura: "F-1", tipo: "Factura", fiscal: true });
    expect(factura.success).toBe(true);
    const remito = await crearFactura({ id_orden: orden.id_orden, num_factura: "R-1", tipo: "Remito", fiscal: true });
    expect(remito.success).toBe(true);
  });

  it("factura anulada: la orden se puede volver a facturar", async () => {
    const orden = await crearOrdenFinalizada();

    const primera = await crearFactura({ id_orden: orden.id_orden, num_factura: "F-1", tipo: "Factura", fiscal: true });
    expect(primera.success).toBe(true);
    if (!primera.success) return;
    const anulacion = await anularFactura(primera.factura.id_factura);
    expect(anulacion.success).toBe(true);

    const segunda = await crearFactura({ id_orden: orden.id_orden, num_factura: "F-2", tipo: "Factura", fiscal: true });
    expect(segunda.success).toBe(true);
  });

  // Bug conocido con issue abierto: crearFactura no pasa la orden a estado
  // "Facturada" (queda en "Finalizado").
  test.fails("crearFactura deberia pasar la orden a estado Facturada", async () => {
    const orden = await crearOrdenFinalizada();

    await crearFactura({
      id_orden: orden.id_orden,
      num_factura: "F-1",
      tipo: "Factura",
      fiscal: true,
    });

    const ordenFinal = await prisma.orden_trabajo.findUnique({ where: { id_orden: orden.id_orden } });
    expect(ordenFinal?.estado_trabajo).toBe("Facturada");
  });

  it("el Remito no deberia generar deuda del cliente", async () => {
    const orden = await crearOrdenFinalizada();

    const resultado = await crearFactura({
      id_orden: orden.id_orden,
      num_factura: "R-1",
      tipo: "Remito",
      fiscal: true,
    });

    expect(resultado.success).toBe(true);
    if (!resultado.success) return;
    expect(resultado.factura.estado_pago).toBe("NO_APLICA");
    expect(Number(resultado.factura.saldo_pendiente)).toBe(0);
  });
});

describe("crearFactura - control de stock insuficiente (CU01/CU16)", () => {
  it("stock suficiente: factura normal, sin aviso", async () => {
    const insumo = await crearInsumo({ stock_actual: 10 });
    const orden = await crearOrdenFinalizada({ insumos: [{ id_insumo: insumo.id_insumo, cantidad_usada: 3 }] });

    const resultado = await crearFactura({
      id_orden: orden.id_orden,
      num_factura: "F-1",
      tipo: "Factura",
      fiscal: true,
    });

    expect(resultado.success).toBe(true);
    if (!resultado.success) return;
    expect(resultado.stockInsuficiente).toBeUndefined();
    const insumoFinal = await prisma.insumo.findUnique({ where: { id_insumo: insumo.id_insumo } });
    expect(Number(insumoFinal?.stock_actual)).toBe(7);
  });

  it("stock insuficiente sin confirmar: no crea la factura, no toca el stock, devuelve el detalle", async () => {
    const insumo = await crearInsumo({ stock_actual: 1, nombre: "Gas R410a", descripcion: "kg" });
    const orden = await crearOrdenFinalizada({ insumos: [{ id_insumo: insumo.id_insumo, cantidad_usada: 5 }] });

    const resultado = await crearFactura({
      id_orden: orden.id_orden,
      num_factura: "F-1",
      tipo: "Factura",
      fiscal: true,
    });

    expect(resultado.success).toBe(false);
    if (resultado.success) return;
    expect(resultado.error).toContain("Stock insuficiente");
    expect(resultado.stockInsuficiente).toEqual([
      {
        id_insumo: insumo.id_insumo,
        nombre: "Gas R410a",
        unidad: "kg",
        disponible: 1,
        requerido: 5,
        faltante: 4,
      },
    ]);

    const insumoFinal = await prisma.insumo.findUnique({ where: { id_insumo: insumo.id_insumo } });
    expect(Number(insumoFinal?.stock_actual)).toBe(1);
    const facturaCreada = await prisma.factura.findFirst({ where: { id_orden: orden.id_orden } });
    expect(facturaCreada).toBeNull();
  });

  it("el mismo insumo en dos lineas de la orden: se suman para el chequeo", async () => {
    const insumo = await crearInsumo({ stock_actual: 3 });
    const orden = await crearOrdenFinalizada({
      insumos: [
        { id_insumo: insumo.id_insumo, cantidad_usada: 2 },
        { id_insumo: insumo.id_insumo, cantidad_usada: 2 },
      ],
    });

    const resultado = await crearFactura({
      id_orden: orden.id_orden,
      num_factura: "F-1",
      tipo: "Factura",
      fiscal: true,
    });

    expect(resultado.success).toBe(false);
    if (resultado.success) return;
    expect(resultado.stockInsuficiente).toHaveLength(1);
    expect(resultado.stockInsuficiente?.[0]).toMatchObject({ id_insumo: insumo.id_insumo, disponible: 3, requerido: 4, faltante: 1 });
  });

  it("un insumo adicional del modal que hace faltar stock: se detecta", async () => {
    const insumo = await crearInsumo({ stock_actual: 4 });
    const orden = await crearOrdenFinalizada({ insumos: [{ id_insumo: insumo.id_insumo, cantidad_usada: 2 }] });

    const resultado = await crearFactura({
      id_orden: orden.id_orden,
      num_factura: "F-1",
      tipo: "Factura",
      fiscal: true,
      insumos: [{ id_insumo: insumo.id_insumo, cantidad: 3 }],
    });

    expect(resultado.success).toBe(false);
    if (resultado.success) return;
    // 2 de la orden + 3 adicionales = 5 requerido contra 4 disponibles
    expect(resultado.stockInsuficiente?.[0]).toMatchObject({ disponible: 4, requerido: 5, faltante: 1 });
  });

  it("stock exacto: factura y deja el stock en cero", async () => {
    const insumo = await crearInsumo({ stock_actual: 5 });
    const orden = await crearOrdenFinalizada({ insumos: [{ id_insumo: insumo.id_insumo, cantidad_usada: 5 }] });

    const resultado = await crearFactura({
      id_orden: orden.id_orden,
      num_factura: "F-1",
      tipo: "Factura",
      fiscal: true,
    });

    expect(resultado.success).toBe(true);
    const insumoFinal = await prisma.insumo.findUnique({ where: { id_insumo: insumo.id_insumo } });
    expect(Number(insumoFinal?.stock_actual)).toBe(0);
  });

  it("un Remito con stock insuficiente se crea sin aviso y no toca el stock", async () => {
    const insumo = await crearInsumo({ stock_actual: 1 });
    const orden = await crearOrdenFinalizada({ insumos: [{ id_insumo: insumo.id_insumo, cantidad_usada: 5 }] });

    const resultado = await crearFactura({
      id_orden: orden.id_orden,
      num_factura: "R-1",
      tipo: "Remito",
      fiscal: true,
    });

    expect(resultado.success).toBe(true);
    const insumoFinal = await prisma.insumo.findUnique({ where: { id_insumo: insumo.id_insumo } });
    expect(Number(insumoFinal?.stock_actual)).toBe(1);
  });

  it("anular una factura que dejo el stock en cero devuelve el stock al valor anterior", async () => {
    const insumo = await crearInsumo({ stock_actual: 5 });
    const orden = await crearOrdenFinalizada({ insumos: [{ id_insumo: insumo.id_insumo, cantidad_usada: 5 }] });

    const resultado = await crearFactura({
      id_orden: orden.id_orden,
      num_factura: "F-1",
      tipo: "Factura",
      fiscal: true,
    });
    expect(resultado.success).toBe(true);
    if (!resultado.success) return;

    const trasFacturar = await prisma.insumo.findUnique({ where: { id_insumo: insumo.id_insumo } });
    expect(Number(trasFacturar?.stock_actual)).toBe(0);

    const anulacion = await anularFactura(resultado.factura.id_factura);
    expect(anulacion.success).toBe(true);

    const trasAnular = await prisma.insumo.findUnique({ where: { id_insumo: insumo.id_insumo } });
    expect(Number(trasAnular?.stock_actual)).toBe(5);
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
      fiscal: true,
    });

    const pendientes = await getOrdenesPendientesFacturacion();
    const ids = pendientes.map((o: { id_orden: number }) => o.id_orden);

    expect(ids).toContain(finalizadaSinFactura.id_orden);
    expect(ids).not.toContain(finalizadaConFactura.id_orden);
    expect(pendientes.every((o: { id_orden: number }) => o.id_orden !== finalizadaConFactura.id_orden)).toBe(true);
    expect(pendientes.length).toBe(1);
  });
});

describe("crearFactura - validaciones de orden y numero", () => {
  it("rechaza facturar una orden que no esta Finalizado y no toca el stock", async () => {
    const insumo = await crearInsumo({ stock_actual: 10 });
    const orden = await crearOrdenFinalizada({ estado_trabajo: "En proceso", insumos: [{ id_insumo: insumo.id_insumo }] });

    const res = await crearFactura({ id_orden: orden.id_orden, num_factura: "Factura A-0001", tipo: "Factura", fiscal: true });

    expect(res.success).toBe(false);
    expect(await prisma.factura.count()).toBe(0);
    expect(Number((await prisma.insumo.findUnique({ where: { id_insumo: insumo.id_insumo } }))!.stock_actual)).toBe(10);
  });

  it("un Remito sobre una orden no finalizada se sigue permitiendo", async () => {
    const orden = await crearOrdenFinalizada({ estado_trabajo: "En proceso", insumos: [] });
    const res = await crearFactura({ id_orden: orden.id_orden, num_factura: "Remito R-0001", tipo: "Remito", fiscal: true });
    expect(res.success).toBe(true);
  });

  it("orden inexistente: error legible", async () => {
    const res = await crearFactura({ id_orden: 99999, num_factura: "F-1", tipo: "Factura", fiscal: true });
    expect(res.success).toBe(false);
    expect(res.error).toContain("no existe");
  });

  it("rechaza un numero ya usado (aunque difiera en mayusculas o espacios)", async () => {
    const o1 = await crearOrdenFinalizada({ insumos: [] });
    const o2 = await crearOrdenFinalizada({ insumos: [] });
    expect((await crearFactura({ id_orden: o1.id_orden, num_factura: "Factura A-0001", tipo: "Factura", fiscal: true, punto_venta: 1 })).success).toBe(true);

    const res = await crearFactura({ id_orden: o2.id_orden, num_factura: " factura a-0001 ", tipo: "Factura", fiscal: true, punto_venta: 1 });

    expect(res.success).toBe(false);
    expect(await prisma.factura.count()).toBe(1);
  });

  it("un numero de una factura anulada no se reusa", async () => {
    const o1 = await crearOrdenFinalizada({ insumos: [] });
    const o2 = await crearOrdenFinalizada({ insumos: [] });
    const f1 = await crearFactura({ id_orden: o1.id_orden, num_factura: "Factura X-0001", tipo: "Factura", fiscal: false });
    expect((await anularFactura(f1.factura.id_factura)).success).toBe(true);

    const res = await crearFactura({ id_orden: o2.id_orden, num_factura: "Factura X-0001", tipo: "Factura", fiscal: false });
    expect(res.success).toBe(false);
  });

  it("el mismo numero en otro punto de venta, o en una factura interna, se permite", async () => {
    const [o1, o2, o3] = [await crearOrdenFinalizada({ insumos: [] }), await crearOrdenFinalizada({ insumos: [] }), await crearOrdenFinalizada({ insumos: [] })];
    expect((await crearFactura({ id_orden: o1.id_orden, num_factura: "0001", tipo: "Factura", fiscal: true, punto_venta: 1 })).success).toBe(true);
    expect((await crearFactura({ id_orden: o2.id_orden, num_factura: "0001", tipo: "Factura", fiscal: true, punto_venta: 2 })).success).toBe(true);
    expect((await crearFactura({ id_orden: o3.id_orden, num_factura: "0001", tipo: "Factura", fiscal: false })).success).toBe(true);
  });

  it("numero vacio se rechaza", async () => {
    const orden = await crearOrdenFinalizada({ insumos: [] });
    expect((await crearFactura({ id_orden: orden.id_orden, num_factura: "   ", tipo: "Factura", fiscal: true })).success).toBe(false);
  });

  it("dos facturas simultaneas de la misma orden: solo una se emite y el stock baja una vez", async () => {
    const insumo = await crearInsumo({ stock_actual: 10 });
    const orden = await crearOrdenFinalizada({ insumos: [{ id_insumo: insumo.id_insumo, cantidad_usada: 1 }] });
    const datos = { id_orden: orden.id_orden, tipo: "Factura", fiscal: true };

    const r = await Promise.all([crearFactura({ ...datos, num_factura: "F-1" }), crearFactura({ ...datos, num_factura: "F-2" })]);

    expect(r.filter((x) => x.success).length).toBe(1);
    expect(await prisma.factura.count()).toBe(1);
    expect(Number((await prisma.insumo.findUnique({ where: { id_insumo: insumo.id_insumo } }))!.stock_actual)).toBe(9);
  });

  it("dos facturas simultaneas de ordenes distintas con el mismo numero: solo una se emite", async () => {
    const o1 = await crearOrdenFinalizada({ insumos: [] });
    const o2 = await crearOrdenFinalizada({ insumos: [] });
    const r = await Promise.all([
      crearFactura({ id_orden: o1.id_orden, num_factura: "F-9", tipo: "Factura", fiscal: true }),
      crearFactura({ id_orden: o2.id_orden, num_factura: "F-9", tipo: "Factura", fiscal: true }),
    ]);
    expect(r.filter((x) => x.success).length).toBe(1);
  });
});
