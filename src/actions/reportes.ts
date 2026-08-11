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

        // 1. Obtener Ingresos (Facturas)
        const facturas = await prisma.factura.findMany({
            where: {
                fecha_emision: {
                    gte: fechaInicio,
                    lte: fechaFin,
                },
                estado_pago: {
                    in: ["PAGADA", "Pagada", "pagada"]
                }
            },
            include: {
                orden_trabajo: {
                    include: {
                        cliente: true
                    }
                }
            },
            orderBy: { fecha_emision: 'asc' }
        });

        // 2. Obtener Egresos (Compras de Insumos)
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

        for (const f of facturas) {
            const monto = Number(f.monto_total);
            totalIngresos += monto;
            const clienteNombre = f.orden_trabajo?.cliente ? `${f.orden_trabajo.cliente.nombre} ${f.orden_trabajo.cliente.apellido}` : "Sin Cliente";
            const desc = f.descripcion ? ` - ${f.descripcion}` : "";
            
            movimientos.push({
                id: `fac-${f.id_factura}`,
                fecha: f.fecha_emision.toISOString(),
                comprobante: f.num_factura ? `Factura ${f.num_factura}` : `Factura #${f.id_factura}`,
                tipo_comprobante: "Ingreso",
                entidad: `${clienteNombre}${desc}`,
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
            balanceGeneral
        };

    } catch (error) {
        console.error("Error al obtener reporte mensual:", error);
        return { movimientos: [], totalIngresos: 0, totalEgresos: 0, balanceGeneral: 0 };
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

        // 3. Facturas por Vencer (Unpaid, ordered by due date)
        const facturasPorVencer = await prisma.factura.findMany({
            where: {
                estado_pago: {
                    in: ["IMPAGA", "PENDIENTE", "Impago", "Pendiente"]
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

        return {
            ordenesEnCurso: JSON.parse(JSON.stringify(ordenesEnCurso)),
            alertasStock: JSON.parse(JSON.stringify(alertasStock)),
            facturasPorVencer: JSON.parse(JSON.stringify(facturasPorVencer))
        };
    } catch (error) {
        console.error("Error al obtener datos del dashboard:", error);
        return { ordenesEnCurso: [], alertasStock: [], facturasPorVencer: [] };
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
