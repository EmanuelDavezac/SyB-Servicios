import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  obtenerReporteMensual,
  obtenerPosicionIVA,
  obtenerDatosDashboard,
  obtenerReporteServicios,
} from "@/actions/reportes";
import { registrarCobro, anularCobro } from "@/actions/cobros";
import { crearCompra } from "@/actions/compras";
import { crearComprobante } from "@/actions/comprobantes";
import { crearCliente, crearOrdenFinalizada, crearComprobanteEmitido, crearInsumo, crearProveedor } from "./factories";

const hoy = new Date();
const MES = hoy.getMonth() + 1;
const ANIO = hoy.getFullYear();

describe("obtenerReporteMensual", () => {
  it("los ingresos son los cobros del mes, no los comprobantes emitidas", async () => {
    const cliente = await crearCliente();
    const comprobanteSinCobrar = await crearComprobanteEmitido({
      id_orden: (await crearOrdenFinalizada({ id_cliente: cliente.id_cliente })).id_orden,
      monto_total: 1000,
      saldo_pendiente: 1000,
    });
    const comprobanteCobrado = await crearComprobanteEmitido({
      id_orden: (await crearOrdenFinalizada({ id_cliente: cliente.id_cliente })).id_orden,
      monto_total: 500,
      saldo_pendiente: 500,
    });
    await registrarCobro({
      id_cliente: cliente.id_cliente,
      imputaciones: [{ id_comprobante: comprobanteCobrado.id_comprobante, monto: 500 }],
    });

    const reporte = await obtenerReporteMensual(MES, ANIO);

    expect(reporte.totalIngresos).toBe(500);
    expect(reporte.totalFacturado).toBe(1500);
    void comprobanteSinCobrar;
  });

  it("un comprobante cobrada mitad este mes y mitad el mes siguiente genera un ingreso en cada mes", async () => {
    const cliente = await crearCliente();
    const orden = await crearOrdenFinalizada({ id_cliente: cliente.id_cliente });
    const comprobante = await crearComprobanteEmitido({ id_orden: orden.id_orden, monto_total: 1000, saldo_pendiente: 1000 });

    // Meses ya pasados: registrarCobro rechaza fechas de pago futuras.
    const finDeMesAnterior = new Date(ANIO, MES - 3, 28, 12, 0, 0);
    const mesAnterior = new Date(ANIO, MES - 2, 5, 12, 0, 0);

    await registrarCobro({
      id_cliente: cliente.id_cliente,
      imputaciones: [{ id_comprobante: comprobante.id_comprobante, monto: 400 }],
      fecha_pago: finDeMesAnterior,
    });
    await registrarCobro({
      id_cliente: cliente.id_cliente,
      imputaciones: [{ id_comprobante: comprobante.id_comprobante, monto: 600 }],
      fecha_pago: mesAnterior,
    });

    const reportePrimerMes = await obtenerReporteMensual(finDeMesAnterior.getMonth() + 1, finDeMesAnterior.getFullYear());
    const reporteSegundoMes = await obtenerReporteMensual(mesAnterior.getMonth() + 1, mesAnterior.getFullYear());

    expect(reportePrimerMes.totalIngresos).toBe(400);
    expect(reporteSegundoMes.totalIngresos).toBe(600);
  });

  it("un cobro anulado no cuenta como ingreso", async () => {
    const cliente = await crearCliente();
    const orden = await crearOrdenFinalizada({ id_cliente: cliente.id_cliente });
    const comprobante = await crearComprobanteEmitido({ id_orden: orden.id_orden, monto_total: 1000, saldo_pendiente: 1000 });

    const cobro = await registrarCobro({
      id_cliente: cliente.id_cliente,
      imputaciones: [{ id_comprobante: comprobante.id_comprobante, monto: 300 }],
    });
    if (!cobro.success) throw new Error(cobro.error);
    await anularCobro(cobro.recibo.id_recibo);

    const reporte = await obtenerReporteMensual(MES, ANIO);
    expect(reporte.totalIngresos).toBe(0);
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

    await crearComprobanteEmitido({ id_orden: orden1.id_orden, monto_total: 1000, saldo_pendiente: 1000, estado_pago: "IMPAGA" });
    await crearComprobanteEmitido({ id_orden: orden2.id_orden, monto_total: 500, saldo_pendiente: 0, estado_pago: "ANULADA" });
    await crearComprobanteEmitido({
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
      totalFacturadoFiscal: 0,
      totalFacturadoInterno: 0,
    });
  });

  it("totalFacturado se separa en fiscal e interno", async () => {
    await crearComprobanteEmitido({ monto_total: 1000, saldo_pendiente: 1000, fiscal: true });
    await crearComprobanteEmitido({ monto_total: 300, saldo_pendiente: 300, fiscal: false });

    const reporte = await obtenerReporteMensual(MES, ANIO);
    expect(reporte.totalFacturado).toBe(1300);
    expect(reporte.totalFacturadoFiscal).toBe(1000);
    expect(reporte.totalFacturadoInterno).toBe(300);
  });

  // Escenario: el comprobante debe 100000, el cliente paga 90000 en efectivo y
  // retiene 10000 (se lo queda el fisco, no entra a caja). La imputacion que
  // salda el comprobante es 100000 (90000 + 10000 de retencion), asi que
  // recibo.monto_total tambien queda en 100000 (cobros.ts no distingue el
  // origen del monto imputado). obtenerReporteMensual resta las retenciones
  // del recibo antes de sumarlas como ingreso de caja, asi que informa los
  // 90000 que realmente entraron, no el monto_total bruto.
  it("el ingreso del mes descuenta las retenciones del recibo", async () => {
    const cliente = await crearCliente();
    const orden = await crearOrdenFinalizada({ id_cliente: cliente.id_cliente });
    const comprobante = await crearComprobanteEmitido({ id_orden: orden.id_orden, monto_total: 100000, saldo_pendiente: 100000 });

    const cobro = await registrarCobro({
      id_cliente: cliente.id_cliente,
      imputaciones: [{ id_comprobante: comprobante.id_comprobante, monto: 100000 }],
      retenciones: [{ tipo: "IVA", monto: 10000 }],
    });
    expect(cobro.success).toBe(true);

    const comprobanteFinal = await prisma.comprobante.findUnique({ where: { id_comprobante: comprobante.id_comprobante } });
    expect(comprobanteFinal?.estado_pago).toBe("PAGADA");

    const reporte = await obtenerReporteMensual(MES, ANIO);
    expect(reporte.totalIngresos).toBe(90000);
  });
});

describe("obtenerPosicionIVA", () => {
  it("neto e IVA de ventas excluyendo anuladas y no facturables", async () => {
    const orden1 = await crearOrdenFinalizada();
    const orden2 = await crearOrdenFinalizada();
    const orden3 = await crearOrdenFinalizada();

    await crearComprobanteEmitido({ id_orden: orden1.id_orden, neto: 1000, alicuota_iva: 21, monto_total: 1210, saldo_pendiente: 1210 });
    await crearComprobanteEmitido({ id_orden: orden2.id_orden, neto: 500, alicuota_iva: 21, monto_total: 0, saldo_pendiente: 0, estado_pago: "ANULADA" });
    await crearComprobanteEmitido({
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

  it("los comprobantes internas no entran en la posicion de IVA", async () => {
    await crearComprobanteEmitido({ neto: 1000, alicuota_iva: 21, monto_total: 1210, saldo_pendiente: 1210, fiscal: true });
    await crearComprobanteEmitido({ neto: 500, alicuota_iva: 21, monto_total: 605, saldo_pendiente: 605, fiscal: false });

    const posicion = await obtenerPosicionIVA(MES, ANIO);
    expect(posicion.ventas.neto).toBe(1000);
    expect(posicion.ventas.iva).toBe(210);
  });

  it("el IVA de ventas se suma desde comprobante_iva cuando el comprobante lo tiene discriminado", async () => {
    await crearComprobanteEmitido({
      neto: 3000,
      monto_total: 3420,
      saldo_pendiente: 3420,
      iva: [
        { alicuota: 21, neto_gravado: 1000, monto_iva: 210 },
        { alicuota: 10.5, neto_gravado: 2000, monto_iva: 210 },
      ],
    });

    const posicion = await obtenerPosicionIVA(MES, ANIO);
    expect(posicion.ventas.neto).toBe(3000);
    expect(posicion.ventas.iva).toBe(420);
  });

  it("comprobante interna generada por crearComprobante no suma IVA, la fiscal si", async () => {
    const ordenFiscal = await crearOrdenFinalizada({ insumos: [] });
    const ordenInterna = await crearOrdenFinalizada({ insumos: [] });
    await crearComprobante({ id_orden: ordenFiscal.id_orden, num_comprobante: "F-1", tipo: "Factura", fiscal: true });
    await crearComprobante({ id_orden: ordenInterna.id_orden, num_comprobante: "X-1", tipo: "Factura", fiscal: false });

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
    const comprobante = await crearComprobanteEmitido({ id_orden: orden.id_orden, monto_total: 1000, saldo_pendiente: 1000 });

    await registrarCobro({
      id_cliente: cliente.id_cliente,
      imputaciones: [{ id_comprobante: comprobante.id_comprobante, monto: 850 }],
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

    await crearComprobanteEmitido({ id_orden: orden1.id_orden, monto_total: 1000, saldo_pendiente: 1000, estado_pago: "IMPAGA" });
    await crearComprobanteEmitido({ id_orden: orden2.id_orden, monto_total: 500, saldo_pendiente: 200, estado_pago: "PARCIAL" });
    await crearComprobanteEmitido({ id_orden: orden3.id_orden, monto_total: 300, saldo_pendiente: 0, estado_pago: "PAGADA" });
    await crearComprobanteEmitido({ id_orden: orden4.id_orden, monto_total: 400, saldo_pendiente: 0, estado_pago: "ANULADA" });

    const dashboard = await obtenerDatosDashboard();
    expect(dashboard.cuentasPorCobrar.total).toBe(1200);
  });
});

describe("obtenerReporteServicios", () => {
  it("filtra por fecha de emision del comprobante, no por fecha_creacion de la orden", async () => {
    const orden = await crearOrdenFinalizada({ estado_trabajo: "Finalizado" });
    // fecha_creacion queda en 2020, pero el comprobante se emite hoy (crearComprobante
    // usa fechaActualArgentina()): el reporte de 2020 no debe traerla, el del
    // mes de emision si.
    await prisma.orden_trabajo.update({
      where: { id_orden: orden.id_orden },
      data: { fecha_creacion: new Date(2020, 0, 15) },
    });
    await crearComprobante({
      id_orden: orden.id_orden,
      num_comprobante: "F-1",
      tipo: "Factura",
      fiscal: true,
    });

    const reporteDe2020 = await obtenerReporteServicios(1, 2020);
    expect(reporteDe2020.map((o: { id_orden: number }) => o.id_orden)).not.toContain(orden.id_orden);

    const reporteDelMesDeEmision = await obtenerReporteServicios(MES, ANIO);
    expect(reporteDelMesDeEmision.map((o: { id_orden: number }) => o.id_orden)).toContain(orden.id_orden);
  });
});
