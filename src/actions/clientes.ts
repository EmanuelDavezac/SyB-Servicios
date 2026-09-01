"use server";

import { prisma } from "@/lib/prisma";

export async function obtenerClientes(filtros?: {
    nombre?: string;
    cuit?: string;
    estado?: string;
}) {
    try {
        const nombre = filtros?.nombre?.trim();
        const cuit = filtros?.cuit?.trim();
        const estado = filtros?.estado;

        const clientes = await prisma.cliente.findMany({
            where: {
                ...(nombre
                    ? {
                          OR: [
                              { nombre: { contains: nombre, mode: "insensitive" } },
                              { apellido: { contains: nombre, mode: "insensitive" } },
                          ],
                      }
                    : {}),
                ...(cuit ? { cuit: { contains: cuit, mode: "insensitive" } } : {}),
                ...(estado === "Activo" ? { estado: true } : {}),
                ...(estado === "Inactivo" ? { estado: false } : {}),
            },
            orderBy: {
                apellido: "asc",
            },
        });

        return clientes;

    } catch (error) {
        console.error("Error al obtener los clientes:", error);
        // Devolvemos un arreglo vacío para que no se rompa la pantalla si hay un error
        return [];
    }
}

// Next.js nos da esta herramienta para actualizar la pantalla automáticamente
import { revalidatePath } from "next/cache";

export async function crearCliente(datos: {
    nombre: string;
    apellido: string;
    cuit?: string;
    telefono?: string;
    email?: string;
    calle?: string;
    num_calle?: number;
    localidad?: string;
}) {
    try {
        const nuevoCliente = await prisma.cliente.create({
            data: {
                nombre: datos.nombre,
                apellido: datos.apellido,
                cuit: datos.cuit || null,
                telefono: datos.telefono || null,
                email: datos.email || null,
                calle: datos.calle || null,
                num_calle: datos.num_calle ?? null,
                localidad: datos.localidad || null,
            },
        });

        // Le avisa a Next.js que recargue la página de clientes para mostrar el nuevo
        revalidatePath("/clientes");
        return { success: true, cliente: nuevoCliente };

    } catch (error) {
        console.error("Error al crear cliente:", error);
        return { success: false, error: "No se pudo crear el cliente" };
    }
}

export async function actualizarCliente(id_cliente: number, datos: {
    nombre: string;
    apellido: string;
    cuit?: string;
    telefono?: string;
    email?: string;
    calle?: string;
    num_calle?: number;
    localidad?: string;
}) {
    try {
        const cliente = await prisma.cliente.update({
            where: { id_cliente },
            data: {
                nombre: datos.nombre,
                apellido: datos.apellido,
                cuit: datos.cuit || null,
                telefono: datos.telefono || null,
                email: datos.email || null,
                calle: datos.calle || null,
                num_calle: datos.num_calle ?? null,
                localidad: datos.localidad || null,
            },
        });

        revalidatePath("/clientes");
        return { success: true, cliente };

    } catch (error) {
        console.error("Error al actualizar cliente:", error);
        return { success: false, error: "No se pudo actualizar el cliente" };
    }
}

export async function eliminarCliente(id_cliente: number) {
    try {
        await prisma.cliente.delete({ where: { id_cliente } });
        revalidatePath("/clientes");
        return { success: true };
    } catch (error) {
        console.error("Error al eliminar cliente:", error);
        return { success: false, error: "No se pudo eliminar el cliente. Puede tener órdenes asociadas." };
    }
}