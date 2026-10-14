"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requerirUsuario } from "@/lib/sesion";
import { formatearListaConLimite } from "@/lib/formato";

// 1. OBTENER (LEER)
export async function obtenerInsumos(opciones?: { incluirInactivos?: boolean }) {
    const incluirInactivos = opciones?.incluirInactivos ?? false;
    try {
        await requerirUsuario();
        const insumos = await prisma.insumo.findMany({
            where: incluirInactivos ? undefined : { estado: { not: false } },
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
            stock_actual: Number(insumo.stock_actual),
            stock_minimo: Number(insumo.stock_minimo),
            precio_costo: Number(insumo.precio_costo),
            precio_venta: Number(insumo.precio_venta),
        }));
    } catch (error) {
        console.error("Error al obtener los insumos:", error);
        return [];
    }
}

async function asegurarProveedorActivo(id_proveedor: number): Promise<void> {
    const proveedor = await prisma.proveedor.findUnique({ where: { id_proveedor }, select: { estado: true } });
    if (!proveedor || proveedor.estado === false) {
        throw new Error("El proveedor seleccionado no existe o está dado de baja");
    }
}

async function nombreDeInsumoYaExiste(nombre: string, idExcluir?: number) {
    const existente = await prisma.insumo.findFirst({
        where: {
            nombre: { equals: nombre, mode: "insensitive" },
            ...(idExcluir ? { id_insumo: { not: idExcluir } } : {}),
        },
        select: { id_insumo: true },
    });
    return !!existente;
}

// Stock y precios por unidad de medida: admiten fracciones pero nunca
// negativos (la facturacion tampoco deja el stock por debajo de 0).
function validarNumerosInsumo(datos: { stock_actual: number; stock_minimo: number; precio_costo: number; precio_venta: number }): void {
    const campos: [string, number][] = [
        ["stock actual", datos.stock_actual],
        ["stock mínimo", datos.stock_minimo],
        ["precio de costo", datos.precio_costo],
        ["precio de venta", datos.precio_venta],
    ];
    for (const [nombre, valor] of campos) {
        const numero = Number(valor);
        if (!Number.isFinite(numero) || numero < 0) {
            throw new Error(`El ${nombre} no puede ser negativo.`);
        }
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
        await requerirUsuario();
        validarNumerosInsumo(datos);
        const nombre = datos.nombre.trim();
        if (await nombreDeInsumoYaExiste(nombre)) {
            return { success: false, error: "Ya existe un insumo con ese nombre" };
        }
        if (datos.id_proveedor) {
            await asegurarProveedorActivo(datos.id_proveedor);
        }
        const nuevoInsumo = await prisma.insumo.create({
            data: {
                nombre,
                descripcion: datos.descripcion,
                id_proveedor: datos.id_proveedor,
                stock_actual: Number(datos.stock_actual),
                stock_minimo: Number(datos.stock_minimo),
                precio_costo: Number(datos.precio_costo),
                precio_venta: Number(datos.precio_venta),
            },
        });

        revalidatePath("/insumos");
        return {
            success: true,
            insumo: {
                ...nuevoInsumo,
                stock_actual: Number(nuevoInsumo.stock_actual),
                stock_minimo: Number(nuevoInsumo.stock_minimo),
                precio_costo: Number(nuevoInsumo.precio_costo),
                precio_venta: Number(nuevoInsumo.precio_venta),
            },
        };
    } catch (error) {
        console.error("Error al crear insumo:", error);
        return { success: false, error: error instanceof Error ? error.message : "No se pudo crear el insumo" };
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
    }
) {
    try {
        await requerirUsuario();
        validarNumerosInsumo(datos);

        const nombre = datos.nombre.trim();
        if (await nombreDeInsumoYaExiste(nombre, id)) {
            return { success: false, error: "Ya existe un insumo con ese nombre" };
        }

        if (datos.id_proveedor) {
            const actual = await prisma.insumo.findUnique({ where: { id_insumo: id }, select: { id_proveedor: true } });
            // Si el proveedor no cambia (sigue siendo el que ya tenia, aunque
            // se haya dado de baja despues), no se revalida: guardar el
            // insumo sin tocar el proveedor no debe perder ese dato.
            if (datos.id_proveedor !== actual?.id_proveedor) {
                await asegurarProveedorActivo(datos.id_proveedor);
            }
        }

        const insumoActualizado = await prisma.insumo.update({
            where: {
                id_insumo: id,
            },
            data: {
                nombre,
                descripcion: datos.descripcion,
                id_proveedor: datos.id_proveedor,
                stock_actual: Number(datos.stock_actual),
                stock_minimo: Number(datos.stock_minimo),
                precio_costo: Number(datos.precio_costo),
                precio_venta: Number(datos.precio_venta),
            },
        });

        revalidatePath("/insumos");
        return {
            success: true,
            insumo: {
                ...insumoActualizado,
                stock_actual: Number(insumoActualizado.stock_actual),
                stock_minimo: Number(insumoActualizado.stock_minimo),
                precio_costo: Number(insumoActualizado.precio_costo),
                precio_venta: Number(insumoActualizado.precio_venta),
            },
        };
    } catch (error) {
        console.error("Error al actualizar insumo:", error);
        return { success: false, error: error instanceof Error ? error.message : "No se pudo actualizar el insumo" };
    }
}

// Pantallas que arman un selector de insumos y no deben seguir ofreciendo uno
// que se acaba de dar de baja (o dejar de ofrecer uno recien reactivado).
function revalidarListadosDeInsumos() {
    revalidatePath("/insumos");
    revalidatePath("/ordenes");
    revalidatePath("/compras");
    revalidatePath("/servicios");
    revalidatePath("/facturacion");
}

/**
 * Baja logica (estado = false), nunca un delete. Se rechaza si el insumo
 * esta en la receta (servicio_insumo) de algun servicio activo: si ese
 * servicio se agrega a una orden, precarga un insumo que ya no deberia
 * poder usarse. Un servicio inactivo no bloquea (su receta ya no se usa).
 */
export async function darDeBajaInsumo(id_insumo: number) {
    try {
        await requerirUsuario();

        await prisma.$transaction(async (tx) => {
            const insumo = await tx.insumo.findUnique({ where: { id_insumo } });
            if (!insumo) {
                throw new Error("El insumo no existe");
            }
            if (insumo.estado === false) {
                throw new Error("El insumo ya está dado de baja");
            }

            const recetas = await tx.servicio_insumo.findMany({
                where: { id_insumo, servicio: { estado: { not: false } } },
                select: { servicio: { select: { nombre: true } } },
                orderBy: { id_servicio: "asc" },
            });

            if (recetas.length > 0) {
                const nombres = [...new Set(recetas.map((r) => r.servicio.nombre))];
                throw new Error(
                    `No se puede dar de baja "${insumo.nombre}": está en la receta de ${formatearListaConLimite(nombres)}.`
                );
            }

            await tx.insumo.update({ where: { id_insumo }, data: { estado: false } });
        });

        revalidarListadosDeInsumos();
        return { success: true };
    } catch (error) {
        console.error("Error al dar de baja insumo:", error);
        return { success: false, error: error instanceof Error ? error.message : "No se pudo dar de baja el insumo" };
    }
}

export async function reactivarInsumo(id_insumo: number) {
    try {
        await requerirUsuario();
        const insumo = await prisma.insumo.findUnique({ where: { id_insumo } });
        if (!insumo) {
            return { success: false, error: "El insumo no existe" };
        }
        if (insumo.estado !== false) {
            return { success: false, error: "El insumo ya está activo" };
        }

        await prisma.insumo.update({ where: { id_insumo }, data: { estado: true } });
        revalidarListadosDeInsumos();
        return { success: true };
    } catch (error) {
        console.error("Error al reactivar insumo:", error);
        return { success: false, error: "No se pudo reactivar el insumo" };
    }
}
