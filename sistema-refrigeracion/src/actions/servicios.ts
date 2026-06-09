"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function obtenerServicios() {
    try {
        return await prisma.servicio.findMany({
            orderBy: { nombre: "asc" },
        });
    } catch (error) {
        console.error("Error al obtener servicios:", error);
        return [];
    }
}

export async function crearServicio(datos: {
    nombre: string;
    descripcion?: string;
    precio: number;
}) {
    try {
        await prisma.servicio.create({
            data: {
                nombre: datos.nombre,
                descripcion: datos.descripcion,
                precio: datos.precio,
            },
        });
        revalidatePath("/servicios");
        return { success: true };
    } catch (error) {
        console.error("Error al crear servicio:", error);
        return { success: false, error: "No se pudo crear el servicio" };
    }
}

export async function editarServicio(
    id_servicio: number,
    datos: {
        nombre: string;
        descripcion?: string;
        precio: number;
    }
) {
    try {
        await prisma.servicio.update({
            where: { id_servicio },
            data: {
                nombre: datos.nombre,
                descripcion: datos.descripcion,
                precio: datos.precio,
            },
        });
        revalidatePath("/servicios");
        return { success: true };
    } catch (error) {
        console.error("Error al editar servicio:", error);
        return { success: false, error: "No se pudo actualizar el servicio" };
    }
}

export async function toggleEstadoServicio(id_servicio: number, estadoActual: boolean) {
    try {
        await prisma.servicio.update({
            where: { id_servicio },
            data: { estado: !estadoActual },
        });
        revalidatePath("/servicios");
        return { success: true };
    } catch (error) {
        console.error("Error al cambiar estado del servicio:", error);
        return { success: false };
    }
}
