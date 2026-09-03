import { describe, it, test, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  obtenerReporteMensual,
  obtenerPosicionIVA,
  obtenerDatosDashboard,
  obtenerReporteServicios,
} from "@/actions/reportes";
import { registrarCobro } from "@/actions/cobros";
import { crearCompra } from "@/actions/compras";
import { crearFactura } from "@/actions/facturacion";
import { crearCliente, crearOrdenFinalizada, crearFacturaEmitida, crearInsumo, crearProveedor } from "./factories";

const hoy = new Date();
const MES = hoy.getMonth() + 1;
const ANIO = hoy.getFullYear();

describe("obtenerReporteMensual", () => {
  it("los ingresos son los cobros del mes, no las facturas emitidas", async () => {
    const cliente = await crearCliente();
    const facturaSinCobrar = await crearFacturaEmitida({
      id_orden: (await crearOrdenFinalizada({ id_cliente: cliente.id_cliente })).id_orden,
      monto_total: 1000,
      saldo_pendiente: 1000,
    });
    const facturaCobrada = await crearFacturaEmitida({
      id_orden: (await crearOrdenFinalizada({ id_cliente: cliente.id_cliente })).id_orden,
      monto_total: 500,
      saldo_pendiente: 500,
    });
    await registrarCobro({
      id_cliente: cliente.id_cliente,
      imputaciones: [{ id_factura: facturaCobrada.id_factura, monto: 500 }],
    });

    const reporte = await obtenerReporteMensual(MES, ANIO);

    expect(reporte.totalIngresos).toBe(500);
    expect(reporte.totalFacturado).toBe(1500);
    void facturaSinCobrar;
  });

  it("una factura cobrada mitad este mes y mitad el mes siguiente genera un ingreso en cada mes", async () => {
    const cliente = await crearCliente();
    const orden = await crearOrdenFinalizada({ id_cliente: cliente.id_cliente });
    const factura = await crearFacturaEmitida({ id_orden: orden.id_orden, monto_total: 1000, saldo_pendiente: 1000 });

    const finDeMes = new Date(ANIO, MES - 1, 28, 12, 0, 0);
    const mesSiguiente = new Date(ANIO, MES, 5, 12, 0, 0);

    await registrarCobro({
      id_cliente: cliente.id_cliente,
      imputaciones: [{ id_factura: factura.id_factura, monto: 400 }],
      fecha_pago: finDeMes,
    });
    await registrarCobro({
      id_cliente: cliente.id_cliente,
      imputaciones: [{ id_factura: factura.id_factura, monto: 600 }],
      fecha_pago: mesSiguiente,
    });

    const anioSiguiente = MES === 12 ? ANIO + 1 : ANIO;
    const mesSiguienteNum = MES === 12 ? 1 : MES + 1;

    const reporteMesActual = await obtenerReporteMensual(MES, ANIO);
    const reporteMesSiguiente = await obtenerReporteMensual(mesSiguienteNum, anioSiguiente);

    expect(reporteMesActual.totalIngresos).toBe(400);
    expect(reporteMesSiguiente.totalIngresos).toBe(600);
  });

  it("los egresos son las compras del mes", async () => {
    const insumo = await crearInsumo();
    await crearCompra({
      alicuota_iva: 21,
      insumos: [{ id_insumo: insumo.id_insumo, cantidad: 2, precio_unitario: 100 }],
    });

    const reporte = await obtenerReporteMensual(MES, ANIO);
    expect(reporte.totalEgresos).toBe(242);
  });

  it("totalFacturado excluye anuladas y no facturables", async () => {
    const orden1 = await crearOrdenFinalizada();
    const orden2 = await crearOrdenFinalizada();
    const orden3 = await crearOrdenFinalizada();

    await crearFacturaEmitida({ id_orden: orden1.id_orden, monto_total: 1000, saldo_pendiente: 1000, estado_pago: "IMPAGA" });
    await crearFacturaEmitida({ id_orden: orden2.id_orden, monto_total: 500, saldo_pendiente: 0, estado_pago: "ANULADA" });
    await crearFacturaEmitida({
      id_orden: orden3.id_orden,
      tipo: "Informe Tecnico",
      monto_total: 0,
      saldo_pendiente: 0,
      estado_pago: "NO_APLICA",
    });

    const reporte = await obtenerReporteMensual(MES, ANIO);
    expect(reporte.totalFacturado).toBe(1000);
  });

  it("mes sin movimientos devuelve todo en cero", async () => {
    const reporte = await obtenerReporteMensual(1, 2000);
    expect(reporte).toEqual({
      movimientos: [],
      totalIngresos: 0,
      totalEgresos: 0,
      balanceGeneral: 0,
      totalFacturado: 0,
    });
  });

  // Bug conocido con issue abierto: obtenerReporteMensual no resta las
  // retenciones del ingreso. Escenario: la factura debe 100000, el cliente
  // paga 90000 en efectivo y retiene 10000 (se lo queda el fisco, no entra a
  // caja). La imputacion que salda la factura es 100000 (90000 + 10000 de
  // retencion), asi que recibo.monto_total tambien queda en 100000 (cobros.ts
  // no distingue el origen del monto imputado). El reporte usa monto_total
  // como ingreso de caja del mes sin restar las retenciones asociadas al
  // recibo, entonces informa 100000 en vez de los 90000 que realmente
  // entraron.
  test.fails("el ingreso del mes descuenta las retenciones del recibo", async () => {
    const cliente = await crearCliente();
    const orden = await crearOrdenFinalizada({ id_cliente: cliente.id_cliente });
    const factura = await crearFacturaEmitida({ id_orden: orden.id_orden, monto_total: 100000, saldo_pendiente: 100000 });

    const cobro = await registrarCobro({
      id_cliente: cliente.id_cliente,
      imputaciones: [{ id_factura: factura.id_factura, monto: 100000 }],
      retenciones: [{ tipo: "IVA", monto: 10000 }],
    });
    expect(cobro.success).toBe(true);

    const facturaFinal = await prisma.factura.findUnique({ where: { id_factura: factura.id_factura } });
    expect(facturaFinal?.estado_pago).toBe("PAGADA");

    const reporte = await obtenerReporteMensual(MES, ANIO);
    expect(reporte.totalIngresos).toBe(90000);
  });
});

describe("obtenerPosicionIVA", () => {
  it("neto e IVA de ventas excluyendo anuladas y no facturables", async () => {
    const orden1 = await crearOrdenFinalizada();
    const orden2 = await crearOrdenFinalizada();
    const orden3 = await crearOrdenFinalizada();

    await crearFacturaEmitida({ id_orden: orden1.id_orden, neto: 1000, alicuota_iva: 21, monto_total: 1210, saldo_pendiente: 1210 });
    await crearFacturaEmitida({ id_orden: orden2.id_orden, neto: 500, alicuota_iva: 21, monto_total: 0, saldo_pendiente: 0, estado_pago: "ANULADA" });
    await crearFacturaEmitida({
      id_orden: orden3.id_orden,
      tipo: "Informe Tecnico",
      monto_total: 0,
      saldo_pendiente: 0,
      estado_pago: "NO_APLICA",
    });

    const posicion = await obtenerPosicionIVA(MES, ANIO);
    expect(posicion.ventas.neto).toBe(1000);
    expect(posicion.ventas.iva).toBe(210);
  });

  it("compras sin neto discriminado marcan sinDatos", async () => {
    const insumo = await crearInsumo();
    await prisma.compra_insumo.create({
      data: {
        fecha_compra: new Date(),
        costo_total: 500,
        neto: null,
        alicuota_iva: null,
        detalle_compra: {
          create: [{ id_insumo: insumo.id_insumo, cantidad: 1, precio_unitario: 500 }],
        },
      },
    });

    const posicion = await obtenerPosicionIVA(MES, ANIO);
    expect(posicion.compras.sinDatos).toBe(true);
    expect(posicion.compras.neto).toBe(0);
  });

  it("retenciones agrupadas por tipo", async () => {
    const cliente = await crearCliente();
    const orden = await crearOrdenFinalizada({ id_cliente: cliente.id_cliente });
    const factura = await crearFacturaEmitida({ id_orden: orden.id_orden, monto_total: 1000, saldo_pendiente: 1000 });

    await registrarCobro({
      id_cliente: cliente.id_cliente,
      imputaciones: [{ id_factura: factura.id_factura, monto: 850 }],
      retenciones: [
        { tipo: "IVA", monto: 100 },
        { tipo: "GANANCIAS", monto: 50 },
      ],
    });

    const posicion = await obtenerPosicionIVA(MES, ANIO);
    expect(posicion.retenciones.IVA).toBe(100);
    expect(posicion.retenciones.GANANCIAS).toBe(50);
    expect(posicion.retenciones.IIBB).toBe(0);
    expect(posicion.retenciones.SUSS).toBe(0);
  });
});

describe("obtenerDatosDashboard", () => {
  it("alertas de stock: solo insumos activos con stock por debajo o igual al minimo", async () => {
    const bajoActivo = await crearInsumo({ stock_actual: 2, stock_minimo: 5, estado: true });
    await crearInsumo({ stock_actual: 1, stock_minimo: 5, estado: false });
    await crearInsumo({ stock_actual: 10, stock_minimo: 5, estado: true });

    const dashboard = await obtenerDatosDashboard();
    const ids = dashboard.alertasStock.map((i: { id_insumo: number }) => i.id_insumo);

    expect(ids).toContain(bajoActivo.id_insumo);
    expect(ids).toHaveLength(1);
  });

  it("cuentas por cobrar suma solo IMPAGA y PARCIAL", async () => {
    const orden1 = await crearOrdenFinalizada();
    const orden2 = await crearOrdenFinalizada();
    const orden3 = await crearOrdenFinalizada();
    const orden4 = await crearOrdenFinalizada();

    await crearFacturaEmitida({ id_orden: orden1.id_orden, monto_total: 1000, saldo_pendiente: 1000, estado_pago: "IMPAGA" });
    await crearFacturaEmitida({ id_orden: orden2.id_orden, monto_total: 500, saldo_pendiente: 200, estado_pago: "PARCIAL" });
    await crearFacturaEmitida({ id_orden: orden3.id_orden, monto_total: 300, saldo_pendiente: 0, estado_pago: "PAGADA" });
    await crearFacturaEmitida({ id_orden: orden4.id_orden, monto_total: 400, saldo_pendiente: 0, estado_pago: "ANULADA" });

    const dashboard = await obtenerDatosDashboard();
    expect(dashboard.cuentasPorCobrar.total).toBe(1200);
  });
});

describe("obtenerReporteServicios", () => {
  it("documenta que filtra por fecha_creacion de la orden, no por fecha de emision del comprobante", async () => {
    const orden = await crearOrdenFinalizada({ estado_trabajo: "Finalizado" });
    await prisma.orden_trabajo.update({
      where: { id_orden: orden.id_orden },
      data: { fecha_creacion: new Date(2020, 0, 15) },
    });
    await crearFactura({
      id_orden: orden.id_orden,
      num_factura: "F-1",
      tipo: "Factura",
      neto: 1000,
      alicuota_iva: 21,
    });

    const reporteDeLaOrden = await obtenerReporteServicios(1, 2020);
    const ids = reporteDeLaOrden.map((o: { id_orden: number }) => o.id_orden);
    expect(ids).toContain(orden.id_orden);
  });

  // Bug conocido con issue abierto: obtenerReporteServicios filtra por
  // fecha_creacion de la orden en vez de por fecha de emision del comprobante.
  test.fails("deberia filtrar por la fecha de emision del comprobante", async () => {
    const orden = await crearOrdenFinalizada({ estado_trabajo: "Finalizado" });
    await prisma.orden_trabajo.update({
      where: { id_orden: orden.id_orden },
      data: { fecha_creacion: new Date(2020, 0, 15) },
    });
    await crearFactura({
      id_orden: orden.id_orden,
      num_factura: "F-1",
      tipo: "Factura",
      neto: 1000,
      alicuota_iva: 21,
    });

    const reporteDelMesDeEmision = await obtenerReporteServicios(MES, ANIO);
    const ids = reporteDelMesDeEmision.map((o: { id_orden: number }) => o.id_orden);
    expect(ids).toContain(orden.id_orden);
  });
});
