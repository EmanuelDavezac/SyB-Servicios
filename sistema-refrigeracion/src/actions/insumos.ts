"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// 0. OBTENER PROVEEDORES (para el select del modal)
export async function obtenerProveedores() {
    try {
        const proveedores = await prisma.proveedor.findMany({
            where: { estado: true },
            orderBy: { razon_social: "asc" },
        });
        return proveedores;
    } catch (error) {
        console.error("Error al obtener proveedores:", error);
        return [];
    }
}

// 1. OBTENER (LEER)
export async function obtenerInsumos() {
    try {
        const insumos = await prisma.insumo.findMany({
            // Le decimos a Prisma que además de traer el insumo, nos traiga los datos de su proveedor
            include: {
                proveedor: true
            },
            // Los ordenamos por nombre alfabéticamente
            orderBy: {
                nombre: "asc",
            },
        });
        // Convertimos los Decimals de Prisma a números planos para que Next.js
        // pueda pasarlos a los Client Components sin error
        return insumos.map((insumo) => ({
            ...insumo,
            precio_costo: Number(insumo.precio_costo),
            precio_venta: Number(insumo.precio_venta),
        }));
    } catch (error) {
        console.error("Error al obtener los insumos:", error);
        return [];
    }
}

// 2. CREAR
export async function crearInsumo(datos: {
    nombre: string;
    descripcion?: string;
    id_proveedor?: number;
    stock_actual: number;
    stock_minimo: number;
    precio_costo: number;
    precio_venta: number;
}) {
    try {
        const nuevoInsumo = await prisma.insumo.create({
            data: {
                nombre: datos.nombre,
                descripcion: datos.descripcion,
                id_proveedor: datos.id_proveedor, // ID numérico del proveedor
                stock_actual: Number(datos.stock_actual),
                stock_minimo: Number(datos.stock_minimo),
                precio_costo: Number(datos.precio_costo),
                precio_venta: Number(datos.precio_venta),
            },
        });

        revalidatePath("/insumos");
        return { success: true, insumo: { ...nuevoInsumo, precio_costo: Number(nuevoInsumo.precio_costo), precio_venta: Number(nuevoInsumo.precio_venta) } };
    } catch (error) {
        console.error("Error al crear insumo:", error);
        return { success: false, error: "No se pudo crear el insumo" };
    }
}

// 3. ACTUALIZAR (EDITAR)
export async function actualizarInsumo(
    id: number,
    datos: {
        nombre: string;
        descripcion?: string;
        id_proveedor?: number;
        stock_actual: number;
        stock_minimo: number;
        precio_costo: number;
        precio_venta: number;
        estado?: boolean;
    }
) {
    try {
        const insumoActualizado = await prisma.insumo.update({
            where: {
                id_insumo: id,
            },
            data: {
                nombre: datos.nombre,
                descripcion: datos.descripcion,
                id_proveedor: datos.id_proveedor,
                stock_actual: Number(datos.stock_actual),
                stock_minimo: Number(datos.stock_minimo),
                precio_costo: Number(datos.precio_costo),
                precio_venta: Number(datos.precio_venta),
                estado: datos.estado,
            },
        });

        revalidatePath("/insumos");
        return { success: true, insumo: { ...insumoActualizado, precio_costo: Number(insumoActualizado.precio_costo), precio_venta: Number(insumoActualizado.precio_venta) } };
    } catch (error) {
        console.error("Error al actualizar insumo:", error);
        return { success: false, error: "No se pudo actualizar el insumo" };
    }
}

// 4. ELIMINAR (DAR DE BAJA)
export async function eliminarInsumo(id: number) {
    try {
        // Podrías en lugar de borrarlo, cambiarle el estado a inactivo si quisieras
        await prisma.insumo.delete({
            where: {
                id_insumo: id,
            },
        });
        revalidatePath("/insumos");
        return { success: true };
    } catch (error) {
        console.error("Error al eliminar insumo:", error);
        return { success: false, error: "No se pudo eliminar el insumo" };
    }
}