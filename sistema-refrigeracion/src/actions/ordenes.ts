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
                }
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

// Edita una orden de trabajo existente
export async function editarOrden(id_orden: number, datos: {
    id_cliente: number;
    estado_trabajo: string;
    notas_internas?: string;
}) {
    try {
        const ordenActualizada = await prisma.orden_trabajo.update({
            where: { id_orden },
            data: {
                id_cliente: datos.id_cliente,
                estado_trabajo: datos.estado_trabajo,
                notas_internas: datos.notas_internas ?? null,
            },
        });

        revalidatePath("/ordenes");
        return { success: true, orden: ordenActualizada };

    } catch (error) {
        console.error("Error al editar la orden:", error);
        return { success: false, error: "No se pudo actualizar la orden" };
    }
}

// Agrega un servicio existente a una orden (detalle_orden_servicio)
export async function agregarServicioAOrden(datos: {
    id_orden: number;
    id_servicio: number;
    cantidad: number;
    precio_acordado: number;
}) {
    try {
        await prisma.detalle_orden_servicio.create({
            data: {
                id_orden: datos.id_orden,
                id_servicio: datos.id_servicio,
                cantidad: datos.cantidad,
                precio_acordado: datos.precio_acordado,
            },
        });
        revalidatePath("/ordenes");
        return { success: true };
    } catch (error) {
        console.error("Error al agregar servicio a orden:", error);
        return { success: false, error: "No se pudo agregar el servicio" };
    }
}

// Crea un servicio nuevo y lo agrega a la orden al mismo tiempo
export async function crearServicioYAgregarAOrden(datos: {
    id_orden: number;
    nombre: string;
    descripcion?: string;
    precio: number;
    cantidad: number;
}) {
    try {
        // Crear el servicio
        const nuevoServicio = await prisma.servicio.create({
            data: {
                nombre: datos.nombre,
                descripcion: datos.descripcion,
                precio: datos.precio,
            },
        });

        // Vincularlo a la orden
        await prisma.detalle_orden_servicio.create({
            data: {
                id_orden: datos.id_orden,
                id_servicio: nuevoServicio.id_servicio,
                cantidad: datos.cantidad,
                precio_acordado: datos.precio,
            },
        });

        revalidatePath("/ordenes");
        revalidatePath("/servicios");
        return { success: true, servicio: nuevoServicio };
    } catch (error) {
        console.error("Error al crear servicio y agregar a orden:", error);
        return { success: false, error: "No se pudo crear el servicio" };
    }
}

// Elimina un detalle de servicio de una orden
export async function quitarServicioDeOrden(id_detalle_srv: number) {
    try {
        await prisma.detalle_orden_servicio.delete({
            where: { id_detalle_srv },
        });
        revalidatePath("/ordenes");
        return { success: true };
    } catch (error) {
        console.error("Error al quitar servicio de orden:", error);
        return { success: false, error: "No se pudo quitar el servicio" };
    }
}

// Obtiene los detalles de servicios de una orden
export async function obtenerServiciosDeOrden(id_orden: number) {
    try {
        const detalles = await prisma.detalle_orden_servicio.findMany({
            where: { id_orden },
            include: { servicio: true },
            orderBy: { id_detalle_srv: "asc" },
        });
        return JSON.parse(JSON.stringify(detalles));
    } catch (error) {
        console.error("Error al obtener servicios de orden:", error);
        return [];
    }
}