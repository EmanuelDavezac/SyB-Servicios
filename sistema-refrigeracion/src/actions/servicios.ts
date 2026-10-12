"use server";

import { prisma } from "@/lib/prisma";
import { serializar } from "@/lib/serializar";
import { revalidatePath } from "next/cache";
import { requerirUsuario } from "@/lib/sesion";
import { formatearListaConLimite } from "@/lib/formato";
import { ESTADOS_ORDEN_EN_CURSO } from "@/lib/estadosOrden";

export async function obtenerServicios(opciones?: {
    incluirInactivos?: boolean;
    nombre?: string;
    precioDesde?: number;
    precioHasta?: number;
    /** "Activo" o "Inactivo" manda por sobre incluirInactivos */
    estado?: string;
}) {
    const incluirInactivos = opciones?.incluirInactivos ?? false;
    try {
        await requerirUsuario();

        const nombre = opciones?.nombre?.trim();
        let precioDesde = opciones?.precioDesde;
        let precioHasta = opciones?.precioHasta;
        // Rango invertido: el filtro de precio no se aplica (CU25), se trae
        // el resto de los filtros igual.
        if (precioDesde !== undefined && precioHasta !== undefined && precioDesde > precioHasta) {
            precioDesde = undefined;
            precioHasta = undefined;
        }

        const where: Record<string, unknown> = {};
        if (opciones?.estado === "Activo") {
            where.estado = { not: false };
        } else if (opciones?.estado === "Inactivo") {
            where.estado = false;
        } else if (!incluirInactivos) {
            where.estado = { not: false };
        }

        if (nombre) {
            where.nombre = { contains: nombre, mode: "insensitive" };
        }
        if (precioDesde !== undefined || precioHasta !== undefined) {
            where.precio = {
                ...(precioDesde !== undefined ? { gte: precioDesde } : {}),
                ...(precioHasta !== undefined ? { lte: precioHasta } : {}),
            };
        }

        const servicios = await prisma.servicio.findMany({
            where,
            orderBy: { nombre: "asc" },
            include: { servicio_insumo: { include: { insumo: true } } },
        });
        // JSON round-trip convierte Decimal → number plano (serializable para Client Components)
        return serializar(servicios);
    } catch (error) {
        console.error("Error al obtener servicios:", error);
        return [];
    }
}

// Exportado: lo usa tambien crearServicioYAgregarAOrden (ordenes.ts), el otro
// lugar donde se puede dar de alta un servicio nuevo en el catalogo.
export async function nombreDeServicioYaExiste(nombre: string, idExcluir?: number) {
    const existente = await prisma.servicio.findFirst({
        where: {
            nombre: { equals: nombre, mode: "insensitive" },
            ...(idExcluir ? { id_servicio: { not: idExcluir } } : {}),
        },
        select: { id_servicio: true },
    });
    return !!existente;
}

export async function crearServicio(datos: {
    nombre: string;
    descripcion?: string;
    precio: number;
}) {
    try {
        await requerirUsuario();
        const nombre = datos.nombre.trim();
        if (await nombreDeServicioYaExiste(nombre)) {
            return { success: false, error: "Ya existe un servicio con ese nombre" };
        }

        const nuevoServicio = await prisma.servicio.create({
            data: {
                nombre,
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

/**
 * Reemplaza la receta de insumos base de un servicio (borra y vuelve a
 * crear). Si se agrega un insumo inactivo que la receta no tenia antes, se
 * rechaza; uno que ya estaba en la receta se preserva aunque su insumo se
 * haya dado de baja despues (si no, guardar el servicio sin tocar la receta
 * perderia esa linea silenciosamente).
 */
export async function actualizarRecetaServicio(
    id_servicio: number,
    insumos: { id_insumo: number; cantidad: number }[]
) {
    try {
        await requerirUsuario();
        await prisma.$transaction(async (tx) => {
            const existentes = await tx.servicio_insumo.findMany({
                where: { id_servicio },
                select: { id_insumo: true },
            });
            const idsExistentes = new Set(existentes.map((e) => e.id_insumo));
            const idsNuevos = [...new Set(insumos.map((i) => i.id_insumo).filter((id) => !idsExistentes.has(id)))];

            if (idsNuevos.length > 0) {
                const inactivos = await tx.insumo.findMany({
                    where: { id_insumo: { in: idsNuevos }, estado: false },
                    select: { nombre: true },
                    orderBy: { nombre: "asc" },
                });
                if (inactivos.length > 0) {
                    const nombres = inactivos.map((i) => i.nombre);
                    const verbo = inactivos.length === 1 ? "está dado de baja" : "están dados de baja";
                    throw new Error(`No se puede agregar a la receta: ${formatearListaConLimite(nombres)} ${verbo}.`);
                }
            }

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
        return { success: false, error: error instanceof Error ? error.message : "No se pudo guardar la receta de insumos" };
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
        await requerirUsuario();
        const nombre = datos.nombre.trim();
        if (await nombreDeServicioYaExiste(nombre, id_servicio)) {
            return { success: false, error: "Ya existe un servicio con ese nombre" };
        }

        await prisma.servicio.update({
            where: { id_servicio },
            data: {
                nombre,
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

// Pantallas que arman un selector de servicios y no deben seguir ofreciendo
// uno que se acaba de dar de baja (o dejar de ofrecer uno recien reactivado).
function revalidarListadosDeServicios() {
    revalidatePath("/servicios");
    revalidatePath("/ordenes");
}

/**
 * Baja logica (estado = false), nunca un delete. Se rechaza si el servicio
 * esta cargado en detalle_orden_servicio de alguna orden Pendiente o En
 * proceso (mismo criterio que validaba el viejo eliminarServicio, que hacia
 * delete fisico).
 */
export async function darDeBajaServicio(id_servicio: number) {
    try {
        await requerirUsuario();

        await prisma.$transaction(async (tx) => {
            const servicio = await tx.servicio.findUnique({ where: { id_servicio } });
            if (!servicio) {
                throw new Error("El servicio no existe");
            }
            if (servicio.estado === false) {
                throw new Error("El servicio ya está dado de baja");
            }

            const ordenes = await tx.orden_trabajo.findMany({
                where: {
                    estado_trabajo: { in: ESTADOS_ORDEN_EN_CURSO },
                    detalle_orden_servicio: { some: { id_servicio } },
                },
                select: { id_orden: true },
                orderBy: { id_orden: "asc" },
            });

            if (ordenes.length > 0) {
                const numeros = ordenes.map((o) => `#${o.id_orden}`);
                const sustantivo = ordenes.length === 1 ? "la orden" : "las órdenes";
                throw new Error(
                    `No se puede dar de baja "${servicio.nombre}": está en uso en ${sustantivo} ${formatearListaConLimite(numeros)} (Pendiente o En proceso).`
                );
            }

            await tx.servicio.update({ where: { id_servicio }, data: { estado: false } });
        });

        revalidarListadosDeServicios();
        return { success: true };
    } catch (error) {
        console.error("Error al dar de baja servicio:", error);
        return { success: false, error: error instanceof Error ? error.message : "No se pudo dar de baja el servicio" };
    }
}

export async function reactivarServicio(id_servicio: number) {
    try {
        await requerirUsuario();
        const servicio = await prisma.servicio.findUnique({ where: { id_servicio } });
        if (!servicio) {
            return { success: false, error: "El servicio no existe" };
        }
        if (servicio.estado !== false) {
            return { success: false, error: "El servicio ya está activo" };
        }

        await prisma.servicio.update({ where: { id_servicio }, data: { estado: true } });
        revalidarListadosDeServicios();
        return { success: true };
    } catch (error) {
        console.error("Error al reactivar servicio:", error);
        return { success: false, error: "No se pudo reactivar el servicio" };
    }
}
