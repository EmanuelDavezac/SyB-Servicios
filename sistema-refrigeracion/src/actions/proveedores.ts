"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function obtenerProveedores() {
    try {
        return await prisma.proveedor.findMany({
            orderBy: { razon_social: "asc" },
        });
    } catch (error) {
        console.error("Error al obtener proveedores:", error);
        return [];
    }
}

export async function crearProveedor(datos: {
    razon_social: string;
    nombre_proveedor?: string;
    cuit?: string;
    telefono?: string;
    email?: string;
}) {
    try {
        await prisma.proveedor.create({ data: datos });
        revalidatePath("/proveedores");
        return { success: true };
    } catch (error) {
        console.error("Error al crear proveedor:", error);
        return { success: false, error: "No se pudo crear el proveedor" };
    }
}

export async function editarProveedor(
    id_proveedor: number,
    datos: {
        razon_social: string;
        nombre_proveedor?: string;
        cuit?: string;
        telefono?: string;
        email?: string;
    }
) {
    try {
        await prisma.proveedor.update({ where: { id_proveedor }, data: datos });
        revalidatePath("/proveedores");
        return { success: true };
    } catch (error) {
        console.error("Error al editar proveedor:", error);
        return { success: false, error: "No se pudo actualizar el proveedor" };
    }
}

export async function toggleEstadoProveedor(id_proveedor: number, estadoActual: boolean) {
    try {
        await prisma.proveedor.update({
            where: { id_proveedor },
            data: { estado: !estadoActual },
        });
        revalidatePath("/proveedores");
        return { success: true };
    } catch (error) {
        console.error("Error al cambiar estado del proveedor:", error);
        return { success: false };
    }
}
