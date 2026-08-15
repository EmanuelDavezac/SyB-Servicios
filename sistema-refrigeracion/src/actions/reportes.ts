"use server";

import { prisma } from "@/lib/prisma";

export type Movimiento = {
    id: string;
    fecha: string;
    comprobante: string;
    tipo_comprobante: "Ingreso" | "Egreso" | "Otro";
    entidad: string;
    monto: number;
};

export async function obtenerReporteMensual(mes: number, anio: number) {
    try {
        const fechaInicio = new Date(anio, mes - 1, 1);
        const fechaFin = new Date(anio, mes, 0, 23, 59, 59, 999);

        // 1. Obtener Ingresos (criterio de caja: recibos cobrados en el mes, no facturas emitidas)
        const recibos = await prisma.recibo.findMany({
            where: {
                fecha_pago: {
                    gte: fechaInicio,
                    lte: fechaFin,
                },
            },
            include: {
                cliente: true,
                pagos_parciales: {
                    include: { factura: true },
                },
            },
            orderBy: { fecha_pago: 'asc' }
        });

        // 2. Total facturado del mes (por fecha de emisión, informativo, no es el ingreso de caja)
        const facturasDelMes = await prisma.factura.findMany({
            where: {
                fecha_emision: {
                    gte: fechaInicio,
                    lte: fechaFin,
                },
                estado_pago: { not: "ANULADA" },
            },
        });
        const totalFacturado = facturasDelMes.reduce((acc, f) => acc + Number(f.monto_total), 0);

        // 3. Obtener Egresos (Compras de Insumos)
        const compras = await prisma.compra_insumo.findMany({
            where: {
                fecha_compra: {
                    gte: fechaInicio,
                    lte: fechaFin,
                },
            },
            include: {
                proveedor: true
            },
            orderBy: { fecha_compra: 'asc' }
        });

        const movimientos: Movimiento[] = [];
        let totalIngresos = 0;
        let totalEgresos = 0;

        for (const r of recibos) {
            const monto = Number(r.monto_total);
            totalIngresos += monto;
            const clienteNombre = r.cliente ? `${r.cliente.nombre} ${r.cliente.apellido}` : "Sin Cliente";
            const facturasImputadas = r.pagos_parciales
                .map((p) => p.factura?.num_factura || `#${p.id_factura}`)
                .join(", ");

            movimientos.push({
                id: `rec-${r.id_recibo}`,
                fecha: r.fecha_pago.toISOString(),
                comprobante: `Recibo #${r.id_recibo} (${facturasImputadas})`,
                tipo_comprobante: "Ingreso",
                entidad: `${clienteNombre}${r.observacion ? ` - ${r.observacion}` : ""}`,
                monto: monto,
            });
        }

        for (const c of compras) {
            const costo = Number(c.costo_total);
            totalEgresos += costo;
            const provNombre = c.proveedor ? c.proveedor.razon_social : "Proveedor N/A";
            const desc = c.descripcion ? ` - ${c.descripcion}` : "";

            movimientos.push({
                id: `com-${c.id_compra}`,
                fecha: c.fecha_compra.toISOString(),
                comprobante: `Compra - ${c.id_compra}`,
                tipo_comprobante: "Egreso",
                entidad: `${provNombre}${desc}`,
                monto: costo,
            });
        }

        // Ordenar por fecha asc
        movimientos.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

        const balanceGeneral = totalIngresos - totalEgresos;

        return {
            movimientos,
            totalIngresos,
            totalEgresos,
            balanceGeneral,
            totalFacturado,
        };

    } catch (error) {
        console.error("Error al obtener reporte mensual:", error);
        return { movimientos: [], totalIngresos: 0, totalEgresos: 0, balanceGeneral: 0, totalFacturado: 0 };
    }
}

export async function obtenerDatosDashboard() {
    try {
        // 1. Trabajos en Curso (Latest 5 orders not finished)
        const ordenesEnCurso = await prisma.orden_trabajo.findMany({
            where: {
                estado_trabajo: {
                    notIn: ["Finalizado", "Entregado", "Anulado"]
                }
            },
            include: {
                cliente: true
            },
            orderBy: {
                fecha_creacion: "desc"
            },
            take: 5
        });

        // 2. Alertas de Stock Bajo (Insumos where stock_actual <= stock_minimo)
        // Usamos queryRaw para comparar dos columnas directamente en la DB
        const alertasStock = await prisma.$queryRaw<any[]>`
            SELECT * FROM insumo 
            WHERE stock_actual <= stock_minimo 
            AND estado = true 
            ORDER BY stock_actual ASC 
            LIMIT 5
        `;

        // 3. Facturas por Vencer (Impagas o parciales, ordenadas por vencimiento)
        const facturasPorVencer = await prisma.factura.findMany({
            where: {
                estado_pago: {
                    in: ["IMPAGA", "PARCIAL"]
                }
            },
            include: {
                orden_trabajo: {
                    include: {
                        cliente: true
                    }
                }
            },
            orderBy: {
                fecha_vencimiento: "asc"
            },
            take: 5
        });

        // 4. Cuentas por cobrar (total y top clientes con deuda)
        const facturasConSaldo = await prisma.factura.findMany({
            where: {
                estado_pago: { in: ["IMPAGA", "PARCIAL"] }
            },
            include: {
                orden_trabajo: { include: { cliente: true } }
            }
        });

        const deudaPorCliente = new Map<number, { id_cliente: number; nombre: string; apellido: string; saldo: number }>();
        let totalCuentasPorCobrar = 0;
        for (const f of facturasConSaldo) {
            const saldo = Number(f.saldo_pendiente);
            totalCuentasPorCobrar += saldo;
            const cliente = f.orden_trabajo?.cliente;
            if (!cliente) continue;
            const actual = deudaPorCliente.get(cliente.id_cliente);
            if (actual) {
                actual.saldo += saldo;
            } else {
                deudaPorCliente.set(cliente.id_cliente, {
                    id_cliente: cliente.id_cliente,
                    nombre: cliente.nombre,
                    apellido: cliente.apellido,
                    saldo,
                });
            }
        }
        const topClientesConDeuda = Array.from(deudaPorCliente.values())
            .sort((a, b) => b.saldo - a.saldo)
            .slice(0, 5);

        return {
            ordenesEnCurso: JSON.parse(JSON.stringify(ordenesEnCurso)),
            alertasStock: JSON.parse(JSON.stringify(alertasStock)),
            facturasPorVencer: JSON.parse(JSON.stringify(facturasPorVencer)),
            cuentasPorCobrar: {
                total: totalCuentasPorCobrar,
                topClientes: topClientesConDeuda,
            },
        };
    } catch (error) {
        console.error("Error al obtener datos del dashboard:", error);
        return {
            ordenesEnCurso: [],
            alertasStock: [],
            facturasPorVencer: [],
            cuentasPorCobrar: { total: 0, topClientes: [] },
        };
    }
}

export async function obtenerReporteServicios(mes: number, anio: number) {
    try {
        const fechaInicio = new Date(anio, mes - 1, 1);
        const fechaFin = new Date(anio, mes, 0, 23, 59, 59, 999);

        const ordenes = await prisma.orden_trabajo.findMany({
            where: {
                estado_trabajo: "Finalizado",
                fecha_creacion: {
                    gte: fechaInicio,
                    lte: fechaFin,
                }
            },
            include: {
                cliente: true,
                detalle_orden_servicio: {
                    include: {
                        servicio: true
                    }
                }
            },
            orderBy: {
                fecha_creacion: "asc"
            }
        });

        return JSON.parse(JSON.stringify(ordenes));
    } catch (error) {
        console.error("Error al obtener reporte de servicios:", error);
        return [];
    }
}
