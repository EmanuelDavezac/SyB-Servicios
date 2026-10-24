import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  editarOrden,
  agregarServicioAOrden,
  agregarServicioLibreAOrden,
  crearServicioYAgregarAOrden,
  quitarServicioDeOrden,
  agregarInsumoAOrden,
  quitarInsumoDeOrden,
  eliminarOrden,
} from "@/actions/ordenes";
import { crearComprobante, getOrdenesPendientesFacturacion } from "@/actions/comprobantes";
import { anularComprobante } from "@/actions/cobros";
import { crearPresupuesto, cambiarEstadoPresupuesto, crearOrdenDesdePresupuesto } from "@/actions/presupuestos";
import { crearCliente, crearInsumo, crearServicio, crearOrdenFinalizada, crearComprobanteEmitido } from "./factories";

const MENSAJE_FACTURADA = "ya está facturada";

async function contarLineas(id_orden: number) {
  const [servicios, insumos] = await Promise.all([
    prisma.detalle_orden_servicio.count({ where: { id_orden } }),
    prisma.detalle_orden_insumo.count({ where: { id_orden } }),
  ]);
  return { servicios, insumos };
}

describe("orden sin comprobante", () => {
  it("editarOrden actualiza cliente, estado y notas", async () => {
    const orden = await crearOrdenFinalizada({ estado_trabajo: "Pendiente" });

    const resultado = await editarOrden(orden.id_orden, {
      id_cliente: orden.id_cliente!,
      estado_trabajo: "En proceso",
      notas_internas: "nota nueva",
    });

    expect(resultado.success).toBe(true);
    const ordenFinal = await prisma.orden_trabajo.findUnique({ where: { id_orden: orden.id_orden } });
    expect(ordenFinal?.estado_trabajo).toBe("En proceso");
    expect(ordenFinal?.notas_internas).toBe("nota nueva");
  });

  it("agregar y quitar servicio e insumo funcionan", async () => {
    const orden = await crearOrdenFinalizada({ servicios: [], insumos: [] });
    const servicio = await crearServicio();
    const insumo = await crearInsumo();

    expect((await agregarServicioAOrden({ id_orden: orden.id_orden, id_servicio: servicio.id_servicio, cantidad: 1, precio_acordado: 500 })).success).toBe(true);
    expect((await agregarInsumoAOrden({ id_orden: orden.id_orden, id_insumo: insumo.id_insumo, cantidad: 2, precio_aplicado: 200 })).success).toBe(true);
    expect(await contarLineas(orden.id_orden)).toEqual({ servicios: 1, insumos: 1 });

    const lineaServicio = await prisma.detalle_orden_servicio.findFirstOrThrow({ where: { id_orden: orden.id_orden } });
    const lineaInsumo = await prisma.detalle_orden_insumo.findFirstOrThrow({ where: { id_orden: orden.id_orden } });
    expect((await quitarServicioDeOrden(lineaServicio.id_detalle_srv)).success).toBe(true);
    expect((await quitarInsumoDeOrden(lineaInsumo.id_detalle_ins)).success).toBe(true);
    expect(await contarLineas(orden.id_orden)).toEqual({ servicios: 0, insumos: 0 });
  });

  it("quitar una linea inexistente devuelve error", async () => {
    const servicio = await quitarServicioDeOrden(999999);
    const insumo = await quitarInsumoDeOrden(999999);

    expect(servicio).toEqual({ success: false, error: "La línea no existe." });
    expect(insumo).toEqual({ success: false, error: "La línea no existe." });
  });

  it("una orden con solo un Remito sigue siendo editable", async () => {
    const orden = await crearOrdenFinalizada();
    await crearComprobanteEmitido({ id_orden: orden.id_orden, tipo: "Remito", estado_pago: "NO_APLICA" });

    const resultado = await editarOrden(orden.id_orden, {
      id_cliente: orden.id_cliente!,
      estado_trabajo: "Finalizado",
      notas_internas: "con remito",
    });
    expect(resultado.success).toBe(true);

    const servicio = await crearServicio();
    const agregado = await agregarServicioAOrden({ id_orden: orden.id_orden, id_servicio: servicio.id_servicio, cantidad: 1, precio_acordado: 500 });
    expect(agregado.success).toBe(true);
  });
});

describe("orden con comprobante vigente", () => {
  async function ordenFacturada() {
    const orden = await crearOrdenFinalizada({ estado_trabajo: "Finalizado" });
    await crearComprobanteEmitido({ id_orden: orden.id_orden });
    return orden;
  }

  function esperarBloqueo(resultado: { success: boolean; error?: string }) {
    expect(resultado.success).toBe(false);
    expect(resultado.error).toContain(MENSAJE_FACTURADA);
  }

  it("editarOrden se rechaza, incluso si solo cambian las notas", async () => {
    const orden = await ordenFacturada();
    const antes = await prisma.orden_trabajo.findUnique({ where: { id_orden: orden.id_orden } });

    esperarBloqueo(await editarOrden(orden.id_orden, {
      id_cliente: orden.id_cliente!,
      estado_trabajo: "Finalizado",
      notas_internas: "solo cambio la nota",
    }));

    const despues = await prisma.orden_trabajo.findUnique({ where: { id_orden: orden.id_orden } });
    expect(despues).toEqual(antes);
  });

  it("agregarServicioAOrden se rechaza", async () => {
    const orden = await ordenFacturada();
    const servicio = await crearServicio();
    const antes = await contarLineas(orden.id_orden);

    esperarBloqueo(await agregarServicioAOrden({ id_orden: orden.id_orden, id_servicio: servicio.id_servicio, cantidad: 1, precio_acordado: 500 }));

    expect(await contarLineas(orden.id_orden)).toEqual(antes);
  });

  it("agregarServicioLibreAOrden se rechaza", async () => {
    const orden = await ordenFacturada();
    const antes = await contarLineas(orden.id_orden);

    esperarBloqueo(await agregarServicioLibreAOrden({ id_orden: orden.id_orden, descripcion_libre: "extra", cantidad: 1, precio_acordado: 500 }));

    expect(await contarLineas(orden.id_orden)).toEqual(antes);
  });

  it("crearServicioYAgregarAOrden se rechaza sin crear el servicio en el catalogo", async () => {
    const orden = await ordenFacturada();
    const lineasAntes = await contarLineas(orden.id_orden);
    const catalogoAntes = await prisma.servicio.count();

    esperarBloqueo(await crearServicioYAgregarAOrden({ id_orden: orden.id_orden, nombre: "Servicio nuevo", precio: 500, cantidad: 1 }));

    expect(await contarLineas(orden.id_orden)).toEqual(lineasAntes);
    expect(await prisma.servicio.count()).toBe(catalogoAntes);
  });

  it("quitarServicioDeOrden se rechaza", async () => {
    const orden = await ordenFacturada();
    const linea = orden.detalle_orden_servicio[0];

    esperarBloqueo(await quitarServicioDeOrden(linea.id_detalle_srv));

    expect(await prisma.detalle_orden_servicio.findUnique({ where: { id_detalle_srv: linea.id_detalle_srv } })).not.toBeNull();
  });

  it("agregarInsumoAOrden se rechaza", async () => {
    const orden = await ordenFacturada();
    const insumo = await crearInsumo();
    const antes = await contarLineas(orden.id_orden);

    esperarBloqueo(await agregarInsumoAOrden({ id_orden: orden.id_orden, id_insumo: insumo.id_insumo, cantidad: 1, precio_aplicado: 200 }));

    expect(await contarLineas(orden.id_orden)).toEqual(antes);
  });

  it("quitarInsumoDeOrden se rechaza", async () => {
    const orden = await ordenFacturada();
    const linea = orden.detalle_orden_insumo[0];

    esperarBloqueo(await quitarInsumoDeOrden(linea.id_detalle_ins));

    expect(await prisma.detalle_orden_insumo.findUnique({ where: { id_detalle_ins: linea.id_detalle_ins } })).not.toBeNull();
  });
});

describe("orden con comprobante anulada", () => {
  it("vuelve a ser editable", async () => {
    const orden = await crearOrdenFinalizada();
    const comprobante = await crearComprobante({ id_orden: orden.id_orden, num_comprobante: "F-1", tipo: "Factura", fiscal: true });
    expect(comprobante.success).toBe(true);
    if (!comprobante.success) return;
    expect((await anularComprobante(comprobante.comprobante.id_comprobante)).success).toBe(true);

    const edicion = await editarOrden(orden.id_orden, {
      id_cliente: orden.id_cliente!,
      estado_trabajo: "Finalizado",
      notas_internas: "tras anular",
    });
    expect(edicion.success).toBe(true);

    const servicio = await crearServicio();
    const agregado = await agregarServicioAOrden({ id_orden: orden.id_orden, id_servicio: servicio.id_servicio, cantidad: 1, precio_acordado: 500 });
    expect(agregado.success).toBe(true);
  });

  it("facturar y anular deja el stock en su valor inicial", async () => {
    const insumo = await crearInsumo({ stock_actual: 10 });
    const orden = await crearOrdenFinalizada({ insumos: [{ id_insumo: insumo.id_insumo, cantidad_usada: 3 }] });

    const comprobante = await crearComprobante({ id_orden: orden.id_orden, num_comprobante: "F-1", tipo: "Factura", fiscal: true });
    expect(comprobante.success).toBe(true);
    if (!comprobante.success) return;
    const trasFacturar = await prisma.insumo.findUnique({ where: { id_insumo: insumo.id_insumo } });
    expect(Number(trasFacturar?.stock_actual)).toBe(7);

    await anularComprobante(comprobante.comprobante.id_comprobante);

    const insumoFinal = await prisma.insumo.findUnique({ where: { id_insumo: insumo.id_insumo } });
    expect(Number(insumoFinal?.stock_actual)).toBe(10);
  });
});

describe("getOrdenesPendientesFacturacion", () => {
  it("incluye una orden Finalizada cuya unica comprobante esta ANULADA", async () => {
    const orden = await crearOrdenFinalizada({ estado_trabajo: "Finalizado" });
    await crearComprobanteEmitido({ id_orden: orden.id_orden, estado_pago: "ANULADA", saldo_pendiente: 0 });

    const pendientes = await getOrdenesPendientesFacturacion();

    expect(pendientes.map((o: { id_orden: number }) => o.id_orden)).toContain(orden.id_orden);
  });

  it("incluye una orden Finalizada que solo tiene un Remito", async () => {
    const orden = await crearOrdenFinalizada({ estado_trabajo: "Finalizado" });
    await crearComprobanteEmitido({ id_orden: orden.id_orden, tipo: "Remito", estado_pago: "NO_APLICA" });

    const pendientes = await getOrdenesPendientesFacturacion();

    expect(pendientes.map((o: { id_orden: number }) => o.id_orden)).toContain(orden.id_orden);
  });
});

describe("eliminarOrden", () => {
  it("borra una orden sin comprobantes junto con sus lineas, sin tocar el stock", async () => {
    const insumo = await crearInsumo({ stock_actual: 10 });
    const orden = await crearOrdenFinalizada({
      estado_trabajo: "Pendiente",
      insumos: [{ id_insumo: insumo.id_insumo, cantidad_usada: 3 }],
    });
    expect(await contarLineas(orden.id_orden)).toEqual({ servicios: 1, insumos: 1 });

    const resultado = await eliminarOrden(orden.id_orden);

    expect(resultado).toEqual({ success: true });
    expect(await prisma.orden_trabajo.findUnique({ where: { id_orden: orden.id_orden } })).toBeNull();
    expect(await contarLineas(orden.id_orden)).toEqual({ servicios: 0, insumos: 0 });
    const insumoFinal = await prisma.insumo.findUniqueOrThrow({ where: { id_insumo: insumo.id_insumo } });
    expect(Number(insumoFinal.stock_actual)).toBe(10);
  });

  it("devuelve error si la orden no existe", async () => {
    expect(await eliminarOrden(999999)).toEqual({ success: false, error: "La orden no existe." });
  });

  it.each([
    { caso: "una Comprobante vigente", tipo: "Factura", estado_pago: "IMPAGA" },
    { caso: "una Comprobante anulada", tipo: "Factura", estado_pago: "ANULADA" },
    { caso: "un Remito", tipo: "Remito", estado_pago: "NO_APLICA" },
  ])("rechaza una orden con $caso y no borra nada", async ({ tipo, estado_pago }) => {
    const orden = await crearOrdenFinalizada();
    await crearComprobanteEmitido({ id_orden: orden.id_orden, tipo, estado_pago });

    const resultado = await eliminarOrden(orden.id_orden);

    expect(resultado).toEqual({
      success: false,
      error: `La orden #${orden.id_orden} tiene comprobantes asociados y no se puede eliminar.`,
    });
    expect(await prisma.orden_trabajo.findUnique({ where: { id_orden: orden.id_orden } })).not.toBeNull();
    expect(await contarLineas(orden.id_orden)).toEqual({ servicios: 1, insumos: 1 });
    expect(await prisma.comprobante.count({ where: { id_orden: orden.id_orden } })).toBe(1);
  });

  it("desvincula el presupuesto y permite volver a generar la orden", async () => {
    const cliente = await crearCliente();
    const creado = await crearPresupuesto({
      destinatario: { id_cliente: cliente.id_cliente, nombre: `${cliente.nombre} ${cliente.apellido}` },
      alicuota_iva: 21,
      lineas: [{ cantidad: 1, descripcion: "Instalacion split", precio_unitario: 1000 }],
    });
    expect(creado.success).toBe(true);
    if (!creado.success) return;
    const id_presupuesto = creado.presupuesto.id_presupuesto;
    await cambiarEstadoPresupuesto(id_presupuesto, "ACEPTADO");

    const primera = await crearOrdenDesdePresupuesto(id_presupuesto);
    expect(primera.success).toBe(true);
    if (!primera.success) return;

    expect(await eliminarOrden(primera.orden.id_orden)).toEqual({ success: true });

    const presupuesto = await prisma.presupuesto.findUniqueOrThrow({ where: { id_presupuesto } });
    expect(presupuesto.id_orden).toBeNull();
    expect(presupuesto.estado).toBe("ACEPTADO");

    const segunda = await crearOrdenDesdePresupuesto(id_presupuesto);
    expect(segunda.success).toBe(true);
    if (!segunda.success) return;
    expect(segunda.orden.id_orden).not.toBe(primera.orden.id_orden);
    const presupuestoFinal = await prisma.presupuesto.findUniqueOrThrow({ where: { id_presupuesto } });
    expect(presupuestoFinal.id_orden).toBe(segunda.orden.id_orden);
  });
});
