"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function obtenerCompras() {
    try {
        const compras = await prisma.compra_insumo.findMany({
            include: {
                proveedor: true,
                detalle_compra: { include: { insumo: true } },
            },
            orderBy: { fecha_compra: "desc" },
        });

        return JSON.parse(JSON.stringify(compras));
    } catch (error) {
        console.error("Error al obtener compras:", error);
        return [];
    }
}

export async function crearCompra(data: {
    id_proveedor?: number;
    fecha_compra?: Date;
    descripcion?: string;
    alicuota_iva: number;
    insumos: { id_insumo: number; cantidad: number; precio_unitario: number }[];
}) {
    try {
        if (!data.insumos || data.insumos.length === 0) {
            return { success: false, error: "Agregá al menos un insumo a la compra." };
        }
        if (data.insumos.some((i) => i.cantidad <= 0 || i.precio_unitario <= 0)) {
            return { success: false, error: "Las cantidades y precios deben ser mayores a cero." };
        }

        const neto = data.insumos.reduce((acc, i) => acc + i.cantidad * i.precio_unitario, 0);
        const costoTotal = neto + (neto * (data.alicuota_iva || 0)) / 100;

        const nuevaCompra = await prisma.$transaction(async (tx) => {
            const compra = await tx.compra_insumo.create({
                data: {
                    ...(data.id_proveedor
                        ? { proveedor: { connect: { id_proveedor: data.id_proveedor } } }
                        : {}),
                    fecha_compra: data.fecha_compra ?? new Date(),
                    costo_total: costoTotal,
                    descripcion: data.descripcion,
                    neto,
                    alicuota_iva: data.alicuota_iva,
                },
            });

            for (const item of data.insumos) {
                await tx.detalle_compra.create({
                    data: {
                        id_compra: compra.id_compra,
                        id_insumo: item.id_insumo,
                        cantidad: item.cantidad,
                        precio_unitario: item.precio_unitario,
                    },
                });
                await tx.insumo.update({
                    where: { id_insumo: item.id_insumo },
                    data: { stock_actual: { increment: item.cantidad } },
                });
            }

            return compra;
        });

        revalidatePath("/compras");
        revalidatePath("/insumos");
        revalidatePath("/reportes");
        return { success: true, compra: JSON.parse(JSON.stringify(nuevaCompra)) };
    } catch (error) {
        console.error("Error creando compra:", error);
        return { success: false, error: error instanceof Error ? error.message : "Error al registrar la compra" };
    }
}

export async function eliminarCompra(id_compra: number) {
    try {
        await prisma.$transaction(async (tx) => {
            const detalles = await tx.detalle_compra.findMany({ where: { id_compra } });

            for (const d of detalles) {
                if (d.id_insumo) {
                    await tx.insumo.update({
                        where: { id_insumo: d.id_insumo },
                        data: { stock_actual: { decrement: d.cantidad } },
                    });
                }
            }

            await tx.detalle_compra.deleteMany({ where: { id_compra } });
            await tx.compra_insumo.delete({ where: { id_compra } });
        });

        revalidatePath("/compras");
        revalidatePath("/insumos");
        revalidatePath("/reportes");
        return { success: true };
    } catch (error) {
        console.error("Error eliminando compra:", error);
        return { success: false, error: "No se pudo eliminar la compra" };
    }
}
