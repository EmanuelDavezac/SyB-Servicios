"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requerirUsuario } from "@/lib/sesion";
import { ALICUOTA_IVA_DEFAULT, alicuotaValida } from "@/lib/comprobantes";
import { ESTADOS_FACTURA } from "@/lib/estadoFactura";

function validarAlicuota(alicuota: number | undefined): number {
    const valor = alicuota ?? ALICUOTA_IVA_DEFAULT;
    if (!alicuotaValida(valor)) {
        throw new Error("La alícuota de IVA debe estar entre 0 y 100.");
    }
    return valor;
}

// Las lineas de una orden ya facturada no se tocan: su IVA ya quedo
// congelado en factura_iva y no se recalculan facturas emitidas.
async function ordenYaFacturada(id_orden: number | null): Promise<boolean> {
    if (id_orden === null) return false;
    const factura = await prisma.factura.findFirst({
        where: { id_orden, estado_pago: { not: ESTADOS_FACTURA.ANULADA } },
        select: { id_factura: true },
    });
    return !!factura;
}

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
                factura: {
                    select: { id_factura: true },
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
        await requerirUsuario();
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
        await requerirUsuario();
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
    alicuota_iva?: number;
}) {
    try {
        await requerirUsuario();
        const alicuota_iva = validarAlicuota(datos.alicuota_iva);
        await prisma.detalle_orden_servicio.create({
            data: {
                id_orden: datos.id_orden,
                id_servicio: datos.id_servicio,
                cantidad: datos.cantidad,
                precio_acordado: datos.precio_acordado,
                alicuota_iva,
            },
        });
        revalidatePath("/ordenes");
        return { success: true };
    } catch (error) {
        console.error("Error al agregar servicio a orden:", error);
        return { success: false, error: "No se pudo agregar el servicio" };
    }
}

// Agrega una línea de texto libre a la orden (sin crear entrada en el catálogo)
export async function agregarServicioLibreAOrden(datos: {
    id_orden: number;
    descripcion_libre: string;
    cantidad: number;
    precio_acordado: number;
    alicuota_iva?: number;
}) {
    try {
        await requerirUsuario();
        const alicuota_iva = validarAlicuota(datos.alicuota_iva);
        await prisma.detalle_orden_servicio.create({
            data: {
                id_orden: datos.id_orden,
                id_servicio: null,
                descripcion_libre: datos.descripcion_libre,
                cantidad: datos.cantidad,
                precio_acordado: datos.precio_acordado,
                alicuota_iva,
            },
        });
        revalidatePath("/ordenes");
        return { success: true };
    } catch (error) {
        console.error("Error al agregar descripcion libre a orden:", error);
        return { success: false, error: "No se pudo agregar la descripcion" };
    }
}

// Crea un servicio nuevo y lo agrega a la orden al mismo tiempo
export async function crearServicioYAgregarAOrden(datos: {
    id_orden: number;
    nombre: string;
    descripcion?: string;
    precio: number;
    cantidad: number;
    alicuota_iva?: number;
}) {
    try {
        await requerirUsuario();
        const alicuota_iva = validarAlicuota(datos.alicuota_iva);
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
                alicuota_iva,
            },
        });

        revalidatePath("/ordenes");
        revalidatePath("/servicios");
        return { success: true, servicio: JSON.parse(JSON.stringify(nuevoServicio)) };
    } catch (error) {
        console.error("Error al crear servicio y agregar a orden:", error);
        return { success: false, error: "No se pudo crear el servicio" };
    }
}

// Elimina un detalle de servicio de una orden
export async function quitarServicioDeOrden(id_detalle_srv: number) {
    try {
        await requerirUsuario();
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

// Cambia la alicuota de IVA de una linea de servicio ya guardada
export async function actualizarAlicuotaServicio(id_detalle_srv: number, alicuota_iva: number) {
    try {
        await requerirUsuario();
        if (!alicuotaValida(alicuota_iva)) {
            return { success: false, error: "La alícuota de IVA debe estar entre 0 y 100." };
        }
        const detalle = await prisma.detalle_orden_servicio.findUnique({ where: { id_detalle_srv } });
        if (!detalle) return { success: false, error: "La línea no existe." };
        if (await ordenYaFacturada(detalle.id_orden)) {
            return { success: false, error: "La orden ya está facturada: no se puede cambiar el IVA." };
        }
        await prisma.detalle_orden_servicio.update({
            where: { id_detalle_srv },
            data: { alicuota_iva },
        });
        revalidatePath("/ordenes");
        return { success: true };
    } catch (error) {
        console.error("Error al actualizar alicuota de servicio:", error);
        return { success: false, error: "No se pudo actualizar el IVA" };
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

// ─── Insumos en la orden ──────────────────────────────────────────────────────
// El stock NO se descuenta aquí; se descuenta al generar la factura (crearFactura).

/** Agrega un insumo a la orden (solo registra cantidad usada, sin mover stock) */
export async function agregarInsumoAOrden(datos: {
    id_orden: number;
    id_insumo: number;
    cantidad: number;
    precio_aplicado: number;
    alicuota_iva?: number;
}) {
    try {
        await requerirUsuario();
        const alicuota_iva = validarAlicuota(datos.alicuota_iva);
        await prisma.detalle_orden_insumo.create({
            data: {
                id_orden: datos.id_orden,
                id_insumo: datos.id_insumo,
                cantidad_usada: datos.cantidad,
                precio_aplicado: datos.precio_aplicado,
                alicuota_iva,
            },
        });
        revalidatePath("/ordenes");
        return { success: true };
    } catch (error) {
        console.error("Error al agregar insumo a la orden:", error);
        return { success: false, error: "No se pudo agregar el insumo" };
    }
}

/** Quita un insumo de la orden */
export async function quitarInsumoDeOrden(id_detalle_ord_insumo: number) {
    try {
        await requerirUsuario();
        await prisma.detalle_orden_insumo.delete({
            where: { id_detalle_ins: id_detalle_ord_insumo },
        });
        revalidatePath("/ordenes");
        return { success: true };
    } catch (error) {
        console.error("Error al quitar insumo de la orden:", error);
        return { success: false, error: "No se pudo quitar el insumo" };
    }
}

/** Cambia la alícuota de IVA de un insumo ya guardado en la orden */
export async function actualizarAlicuotaInsumo(id_detalle_ord_insumo: number, alicuota_iva: number) {
    try {
        await requerirUsuario();
        if (!alicuotaValida(alicuota_iva)) {
            return { success: false, error: "La alícuota de IVA debe estar entre 0 y 100." };
        }
        const detalle = await prisma.detalle_orden_insumo.findUnique({ where: { id_detalle_ins: id_detalle_ord_insumo } });
        if (!detalle) return { success: false, error: "La línea no existe." };
        if (await ordenYaFacturada(detalle.id_orden)) {
            return { success: false, error: "La orden ya está facturada: no se puede cambiar el IVA." };
        }
        await prisma.detalle_orden_insumo.update({
            where: { id_detalle_ins: id_detalle_ord_insumo },
            data: { alicuota_iva },
        });
        revalidatePath("/ordenes");
        return { success: true };
    } catch (error) {
        console.error("Error al actualizar alicuota de insumo:", error);
        return { success: false, error: "No se pudo actualizar el IVA" };
    }
}

/** Obtiene todos los insumos registrados para una orden */
export async function obtenerInsumosDeOrden(id_orden: number) {
    try {
        const detalles = await prisma.detalle_orden_insumo.findMany({
            where: { id_orden },
            include: { insumo: true },
            orderBy: { id_detalle_ins: "asc" },
        });
        const detallesJson = JSON.parse(JSON.stringify(detalles));
        return detallesJson.map((d: { id_detalle_ins: number }) => ({
            ...d,
            id_detalle_ord_insumo: d.id_detalle_ins,
        }));
    } catch (error) {
        console.error("Error al obtener insumos de la orden:", error);
        return [];
    }
}