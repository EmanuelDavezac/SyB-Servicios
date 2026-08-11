"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function obtenerFacturasProveedor() {
    try {
        const facturas = await prisma.factura_proveedor.findMany({
            include: { proveedor: true },
            orderBy: { fecha_emision: "desc" },
        });
        return facturas.map((f) => ({
            ...f,
            monto_total: Number(f.monto_total),
        }));
    } catch (error) {
        console.error("Error al obtener facturas de proveedor:", error);
        return [];
    }
}

export async function crearFacturaProveedor(datos: {
    id_proveedor?: number;
    num_factura?: string;
    tipo?: string;
    fecha_emision: string;
    monto_total: number;
    estado_pago?: string;
    notas?: string;
}) {
    try {
        const nueva = await prisma.factura_proveedor.create({
            data: {
                id_proveedor: datos.id_proveedor ?? null,
                num_factura: datos.num_factura || null,
                tipo: datos.tipo || null,
                fecha_emision: new Date(datos.fecha_emision),
                monto_total: datos.monto_total,
                estado_pago: datos.estado_pago || "Impaga",
                notas: datos.notas || null,
            },
        });
        revalidatePath("/insumos");
        revalidatePath("/reportes");
        return { success: true, factura: { ...nueva, monto_total: Number(nueva.monto_total) } };
    } catch (error) {
        console.error("Error al crear factura de proveedor:", error);
        return { success: false, error: "No se pudo registrar la factura." };
    }
}

export async function actualizarEstadoFacturaProveedor(id: number, estado_pago: string) {
    try {
        await prisma.factura_proveedor.update({
            where: { id_factura_prov: id },
            data: { estado_pago },
        });
        revalidatePath("/insumos");
        revalidatePath("/reportes");
        return { success: true };
    } catch (error) {
        console.error("Error al actualizar estado de factura:", error);
        return { success: false };
    }
}
