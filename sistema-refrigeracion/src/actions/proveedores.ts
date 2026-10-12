"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requerirUsuario } from "@/lib/sesion";
import { formatearListaConLimite } from "@/lib/formato";

// Mensaje de "ya existe" cuando el chequeo previo no alcanzo a frenarlo (dos
// altas en simultaneo) y lo termina frenando la constraint unique de la
// columna cuit en la base: sin esto, Prisma tira un P2002 generico.
function mensajeDeErrorProveedor(error: unknown, fallback: string): string {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return "Ya existe un proveedor con ese CUIT";
    }
    return fallback;
}

export async function obtenerProveedores(opciones?: {
    incluirInactivos?: boolean;
    /** Busca en razon_social y tambien en nombre_proveedor (el contacto): en la tabla se muestran juntos */
    razonSocial?: string;
    cuit?: string;
    /** "Activo" o "Inactivo" manda por sobre incluirInactivos */
    estado?: string;
}) {
    const incluirInactivos = opciones?.incluirInactivos ?? false;
    try {
        await requerirUsuario();

        const razonSocial = opciones?.razonSocial?.trim();
        const cuit = opciones?.cuit?.trim();

        const where: Record<string, unknown> = {};
        if (opciones?.estado === "Activo") {
            where.estado = { not: false };
        } else if (opciones?.estado === "Inactivo") {
            where.estado = false;
        } else if (!incluirInactivos) {
            where.estado = { not: false };
        }

        if (razonSocial) {
            where.OR = [
                { razon_social: { contains: razonSocial, mode: "insensitive" } },
                { nombre_proveedor: { contains: razonSocial, mode: "insensitive" } },
            ];
        }
        if (cuit) {
            where.cuit = { contains: cuit, mode: "insensitive" };
        }

        return await prisma.proveedor.findMany({
            where,
            orderBy: { razon_social: "asc" },
        });
    } catch (error) {
        console.error("Error al obtener proveedores:", error);
        return [];
    }
}

async function emailYaExiste(email: string, idExcluir?: number) {
    const existente = await prisma.proveedor.findFirst({
        where: {
            email: { equals: email, mode: "insensitive" },
            ...(idExcluir ? { id_proveedor: { not: idExcluir } } : {}),
        },
        select: { id_proveedor: true },
    });
    return !!existente;
}

async function cuitYaExiste(cuit: string, idExcluir?: number) {
    const existente = await prisma.proveedor.findFirst({
        where: {
            cuit: { equals: cuit, mode: "insensitive" },
            ...(idExcluir ? { id_proveedor: { not: idExcluir } } : {}),
        },
        select: { id_proveedor: true },
    });
    return !!existente;
}

export async function crearProveedor(datos: {
    razon_social: string;
    nombre_proveedor?: string;
    cuit?: string;
    telefono?: string;
    email?: string;
}) {
    try {
        await requerirUsuario();
        const cuit = datos.cuit?.trim();
        if (cuit && (await cuitYaExiste(cuit))) {
            return { success: false, error: "Ya existe un proveedor con ese CUIT" };
        }
        const email = datos.email?.trim();
        if (email && (await emailYaExiste(email))) {
            return { success: false, error: "Ya existe un proveedor con ese email" };
        }
        await prisma.proveedor.create({ data: datos });
        revalidatePath("/proveedores");
        return { success: true };
    } catch (error) {
        console.error("Error al crear proveedor:", error);
        return { success: false, error: mensajeDeErrorProveedor(error, "No se pudo crear el proveedor") };
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
        await requerirUsuario();
        const cuit = datos.cuit?.trim();
        if (cuit && (await cuitYaExiste(cuit, id_proveedor))) {
            return { success: false, error: "Ya existe un proveedor con ese CUIT" };
        }
        const email = datos.email?.trim();
        if (email && (await emailYaExiste(email, id_proveedor))) {
            return { success: false, error: "Ya existe un proveedor con ese email" };
        }
        await prisma.proveedor.update({ where: { id_proveedor }, data: datos });
        revalidatePath("/proveedores");
        return { success: true };
    } catch (error) {
        console.error("Error al editar proveedor:", error);
        return { success: false, error: mensajeDeErrorProveedor(error, "No se pudo actualizar el proveedor") };
    }
}

// Pantallas que arman un selector de proveedores y no deben seguir
// ofreciendo uno que se acaba de dar de baja (o dejar de ofrecer uno recien
// reactivado).
function revalidarListadosDeProveedores() {
    revalidatePath("/proveedores");
    revalidatePath("/insumos");
    revalidatePath("/compras");
}

/**
 * Baja logica (estado = false), nunca un delete. Se rechaza si el proveedor
 * tiene insumos activos a su nombre: ese insumo seguiria pudiendo usarse en
 * operaciones nuevas con un proveedor que ya no existe para el negocio.
 */
export async function darDeBajaProveedor(id_proveedor: number) {
    try {
        await requerirUsuario();

        await prisma.$transaction(async (tx) => {
            const proveedor = await tx.proveedor.findUnique({ where: { id_proveedor } });
            if (!proveedor) {
                throw new Error("El proveedor no existe");
            }
            if (proveedor.estado === false) {
                throw new Error("El proveedor ya está dado de baja");
            }

            const insumosActivos = await tx.insumo.findMany({
                where: { id_proveedor, estado: { not: false } },
                select: { nombre: true },
                orderBy: { nombre: "asc" },
            });

            if (insumosActivos.length > 0) {
                const nombres = insumosActivos.map((i) => i.nombre);
                throw new Error(
                    `No se puede dar de baja a ${proveedor.razon_social}: tiene insumos activos a su nombre (${formatearListaConLimite(nombres)}).`
                );
            }

            await tx.proveedor.update({ where: { id_proveedor }, data: { estado: false } });
        });

        revalidarListadosDeProveedores();
        return { success: true };
    } catch (error) {
        console.error("Error al dar de baja proveedor:", error);
        return { success: false, error: error instanceof Error ? error.message : "No se pudo dar de baja al proveedor" };
    }
}

export async function reactivarProveedor(id_proveedor: number) {
    try {
        await requerirUsuario();
        const proveedor = await prisma.proveedor.findUnique({ where: { id_proveedor } });
        if (!proveedor) {
            return { success: false, error: "El proveedor no existe" };
        }
        if (proveedor.estado !== false) {
            return { success: false, error: "El proveedor ya está activo" };
        }

        await prisma.proveedor.update({ where: { id_proveedor }, data: { estado: true } });
        revalidarListadosDeProveedores();
        return { success: true };
    } catch (error) {
        console.error("Error al reactivar proveedor:", error);
        return { success: false, error: "No se pudo reactivar el proveedor" };
    }
}
