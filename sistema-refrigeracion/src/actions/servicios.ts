"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function obtenerServicios() {
    try {
        const servicios = await prisma.servicio.findMany({
            orderBy: { nombre: "asc" },
            include: { servicio_insumo: { include: { insumo: true } } },
        });
        // JSON round-trip convierte Decimal → number plano (serializable para Client Components)
        return JSON.parse(JSON.stringify(servicios));
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
        const nuevoServicio = await prisma.servicio.create({
            data: {
                nombre: datos.nombre,
                descripcion: datos.descripcion,
                precio: datos.precio,
            },
        });
        revalidatePath("/servicios");
        return { success: true, servicio: JSON.parse(JSON.stringify(nuevoServicio)) };
    } catch (error) {
        console.error("Error al crear servicio:", error);
        return { success: false, error: "No se pudo crear el servicio" };
    }
}

/** Reemplaza la receta de insumos base de un servicio (borra y vuelve a crear) */
export async function actualizarRecetaServicio(
    id_servicio: number,
    insumos: { id_insumo: number; cantidad: number }[]
) {
    try {
        await prisma.$transaction(async (tx) => {
            await tx.servicio_insumo.deleteMany({ where: { id_servicio } });
            if (insumos.length > 0) {
                await tx.servicio_insumo.createMany({
                    data: insumos.map((i) => ({
                        id_servicio,
                        id_insumo: i.id_insumo,
                        cantidad: i.cantidad,
                    })),
                });
            }
        });
        revalidatePath("/servicios");
        return { success: true };
    } catch (error) {
        console.error("Error al actualizar receta del servicio:", error);
        return { success: false, error: "No se pudo guardar la receta de insumos" };
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
