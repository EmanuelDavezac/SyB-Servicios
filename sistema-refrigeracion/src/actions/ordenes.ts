"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Trae todas las órdenes con el nombre del cliente incluido
export async function obtenerOrdenes() {
    try {
        const ordenes = await prisma.orden_trabajo.findMany({
            orderBy: {
                fecha_creacion: "desc",
            },
            include: {
                cliente: {
                    select: {
                        nombre: true,
                        apellido: true,
                    },
                },
            },
        });

        return ordenes;

    } catch (error) {
        console.error("Error al obtener las órdenes:", error);
        return [];
    }
}

// Trae solo los clientes activos para el select del modal
export async function obtenerClientesActivos() {
    try {
        const clientes = await prisma.cliente.findMany({
            where: { estado: true },
            orderBy: { apellido: "asc" },
            select: {
                id_cliente: true,
                nombre: true,
                apellido: true,
            },
        });

        return clientes;

    } catch (error) {
        console.error("Error al obtener clientes activos:", error);
        return [];
    }
}

// Crea una nueva orden de trabajo
export async function crearOrden(datos: {
    id_cliente: number;
    estado_trabajo: string;
    notas_internas?: string;
}) {
    try {
        const nuevaOrden = await prisma.orden_trabajo.create({
            data: {
                id_cliente: datos.id_cliente,
                estado_trabajo: datos.estado_trabajo,
                notas_internas: datos.notas_internas,
            },
        });

        revalidatePath("/ordenes");
        return { success: true, orden: nuevaOrden };

    } catch (error) {
        console.error("Error al crear la orden:", error);
        return { success: false, error: "No se pudo crear la orden" };
    }
}