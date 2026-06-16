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
