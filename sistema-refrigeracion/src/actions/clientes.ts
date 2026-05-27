"use server";

import { prisma } from "@/lib/prisma";

export async function obtenerClientes() {
    try {
        // Prisma viaja a la base de datos y trae todos los registros de la tabla 'cliente'
        const clientes = await prisma.cliente.findMany({
            // Opcional: ordenarlos alfabéticamente por apellido
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

export async function crearCliente(datos: { nombre: string; apellido: string; cuit?: string; telefono?: string }) {
    try {
        const nuevoCliente = await prisma.cliente.create({
            data: {
                nombre: datos.nombre,
                apellido: datos.apellido,
                cuit: datos.cuit,
                telefono: datos.telefono,
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