"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

interface Destinatario {
    id_cliente?: number | null;
    nombre: string;
    cuit?: string;
    domicilio?: string;
    localidad?: string;
    condicion_iva?: string;
}

interface LineaPresupuesto {
    orden_linea?: number;
    cantidad: number;
    descripcion: string;
    precio_unitario: number;
    id_servicio?: number | null;
}

interface DatosPresupuesto {
    destinatario: Destinatario;
    fecha_emision?: Date;
    validez_dias?: number;
    condicion_pago?: string;
    alicuota_iva?: number;
    observaciones?: string;
    lineas: LineaPresupuesto[];
}

function calcularTotales(lineas: { cantidad: unknown; precio_unitario: unknown }[], alicuota_iva: unknown) {
    const subtotal = lineas.reduce((acc, l) => acc + Number(l.cantidad) * Number(l.precio_unitario), 0);
    const monto_iva = subtotal * (Number(alicuota_iva) / 100);
    const total = subtotal + monto_iva;
    return { subtotal, monto_iva, total };
}

function calcularVencimiento(fecha_emision: Date, validez_dias: number) {
    const vencimiento = new Date(fecha_emision);
    vencimiento.setDate(vencimiento.getDate() + validez_dias);
    return vencimiento;
}

export async function crearPresupuesto(data: DatosPresupuesto) {
    try {
        if (!data.lineas || data.lineas.length === 0) {
            throw new Error("El presupuesto debe tener al menos una línea.");
        }

        const nuevoPresupuesto = await prisma.$transaction(async (tx) => {
            return tx.presupuesto.create({
                data: {
                    id_cliente: data.destinatario.id_cliente ?? null,
                    destinatario_nombre: data.destinatario.nombre,
                    destinatario_cuit: data.destinatario.cuit || null,
                    destinatario_domicilio: data.destinatario.domicilio || null,
                    destinatario_localidad: data.destinatario.localidad || null,
                    destinatario_condicion_iva: data.destinatario.condicion_iva || null,
                    fecha_emision: data.fecha_emision ?? new Date(),
                    validez_dias: data.validez_dias ?? 5,
                    condicion_pago: data.condicion_pago || null,
                    alicuota_iva: data.alicuota_iva ?? 21,
                    observaciones: data.observaciones || null,
                    detalle_presupuesto: {
                        create: data.lineas.map((l, idx) => ({
                            orden_linea: l.orden_linea ?? idx + 1,
                            cantidad: l.cantidad,
                            descripcion: l.descripcion,
                            precio_unitario: l.precio_unitario,
                            id_servicio: l.id_servicio || null,
                        })),
                    },
                },
            });
        });

        revalidatePath("/presupuestos");
        return { success: true, presupuesto: JSON.parse(JSON.stringify(nuevoPresupuesto)) };
    } catch (error) {
        console.error("Error creating presupuesto:", error);
        return { success: false, error: error instanceof Error ? error.message : "Error al crear el presupuesto" };
    }
}

export async function actualizarPresupuesto(id_presupuesto: number, data: DatosPresupuesto) {
    try {
        const actualizado = await prisma.$transaction(async (tx) => {
            const actual = await tx.presupuesto.findUnique({ where: { id_presupuesto } });
            if (!actual) throw new Error("Presupuesto no encontrado");
            if (actual.estado !== "PENDIENTE") {
                throw new Error("Solo se pueden editar presupuestos con estado PENDIENTE");
            }
            if (!data.lineas || data.lineas.length === 0) {
                throw new Error("El presupuesto debe tener al menos una línea.");
            }

            await tx.detalle_presupuesto.deleteMany({ where: { id_presupuesto } });

            return tx.presupuesto.update({
                where: { id_presupuesto },
                data: {
                    id_cliente: data.destinatario.id_cliente ?? null,
                    destinatario_nombre: data.destinatario.nombre,
                    destinatario_cuit: data.destinatario.cuit || null,
                    destinatario_domicilio: data.destinatario.domicilio || null,
                    destinatario_localidad: data.destinatario.localidad || null,
                    destinatario_condicion_iva: data.destinatario.condicion_iva || null,
                    fecha_emision: data.fecha_emision ?? actual.fecha_emision,
                    validez_dias: data.validez_dias ?? actual.validez_dias,
                    condicion_pago: data.condicion_pago || null,
                    alicuota_iva: data.alicuota_iva ?? actual.alicuota_iva,
                    observaciones: data.observaciones || null,
                    detalle_presupuesto: {
                        create: data.lineas.map((l, idx) => ({
                            orden_linea: l.orden_linea ?? idx + 1,
                            cantidad: l.cantidad,
                            descripcion: l.descripcion,
                            precio_unitario: l.precio_unitario,
                            id_servicio: l.id_servicio || null,
                        })),
                    },
                },
            });
        });

        revalidatePath("/presupuestos");
        return { success: true, presupuesto: JSON.parse(JSON.stringify(actualizado)) };
    } catch (error) {
        console.error("Error updating presupuesto:", error);
        return { success: false, error: error instanceof Error ? error.message : "Error al actualizar el presupuesto" };
    }
}

export async function obtenerPresupuestos(filtros?: {
    estado?: string;
    fechaInicio?: string;
    fechaFin?: string;
}) {
    try {
        const where: Record<string, unknown> = {};

        if (filtros?.estado) {
            where.estado = filtros.estado;
        }
        if (filtros?.fechaInicio || filtros?.fechaFin) {
            where.fecha_emision = {
                ...(filtros.fechaInicio ? { gte: new Date(`${filtros.fechaInicio}T00:00:00`) } : {}),
                ...(filtros.fechaFin ? { lte: new Date(`${filtros.fechaFin}T23:59:59.999`) } : {}),
            };
        }

        const presupuestos = await prisma.presupuesto.findMany({
            where,
            include: {
                detalle_presupuesto: true,
                cliente: true,
            },
            orderBy: { fecha_emision: "desc" },
        });

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const conCalculados = presupuestos.map((p) => {
            const { subtotal, monto_iva, total } = calcularTotales(p.detalle_presupuesto, p.alicuota_iva as unknown as number);
            const fecha_vencimiento = calcularVencimiento(p.fecha_emision, p.validez_dias);
            const vencido = fecha_vencimiento < hoy;
            return { ...p, subtotal, monto_iva, total, fecha_vencimiento, vencido };
        });

        return JSON.parse(JSON.stringify(conCalculados));
    } catch (error) {
        console.error("Error fetching presupuestos:", error);
        return [];
    }
}

export async function obtenerPresupuestoCompleto(id_presupuesto: number) {
    try {
        const presupuesto = await prisma.presupuesto.findUnique({
            where: { id_presupuesto },
            include: {
                detalle_presupuesto: {
                    include: { servicio: true },
                    orderBy: { orden_linea: "asc" },
                },
                cliente: true,
            },
        });

        if (!presupuesto) return null;

        const { subtotal, monto_iva, total } = calcularTotales(presupuesto.detalle_presupuesto, presupuesto.alicuota_iva as unknown as number);
        const fecha_vencimiento = calcularVencimiento(presupuesto.fecha_emision, presupuesto.validez_dias);
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const vencido = fecha_vencimiento < hoy;

        return JSON.parse(JSON.stringify({ ...presupuesto, subtotal, monto_iva, total, fecha_vencimiento, vencido }));
    } catch (error) {
        console.error("Error fetching presupuesto completo:", error);
        return null;
    }
}

export async function cambiarEstadoPresupuesto(id_presupuesto: number, estado: "ACEPTADO" | "RECHAZADO") {
    try {
        const actual = await prisma.presupuesto.findUnique({ where: { id_presupuesto } });
        if (!actual) throw new Error("Presupuesto no encontrado");
        if (actual.estado !== "PENDIENTE") {
            throw new Error("Solo se puede cambiar el estado de un presupuesto PENDIENTE");
        }

        const actualizado = await prisma.presupuesto.update({
            where: { id_presupuesto },
            data: { estado },
        });

        revalidatePath("/presupuestos");
        return { success: true, presupuesto: JSON.parse(JSON.stringify(actualizado)) };
    } catch (error) {
        console.error("Error changing estado presupuesto:", error);
        return { success: false, error: error instanceof Error ? error.message : "Error al cambiar el estado del presupuesto" };
    }
}

export async function eliminarPresupuesto(id_presupuesto: number) {
    try {
        const actual = await prisma.presupuesto.findUnique({ where: { id_presupuesto } });
        if (!actual) throw new Error("Presupuesto no encontrado");
        if (actual.estado !== "PENDIENTE") {
            throw new Error("Solo se pueden eliminar presupuestos PENDIENTES");
        }

        await prisma.presupuesto.delete({ where: { id_presupuesto } });
        revalidatePath("/presupuestos");
        return { success: true };
    } catch (error) {
        console.error("Error deleting presupuesto:", error);
        return { success: false, error: error instanceof Error ? error.message : "No se pudo eliminar el presupuesto" };
    }
}

export async function buscarDestinatarios(query: string) {
    try {
        if (!query || query.trim().length < 2) return [];
        const texto = query.trim();

        const [clientes, presupuestosPrevios] = await Promise.all([
            prisma.cliente.findMany({
                where: {
                    OR: [
                        { nombre: { contains: texto, mode: "insensitive" } },
                        { apellido: { contains: texto, mode: "insensitive" } },
                    ],
                },
                take: 5,
            }),
            prisma.presupuesto.findMany({
                where: {
                    id_cliente: null,
                    destinatario_nombre: { contains: texto, mode: "insensitive" },
                },
                distinct: ["destinatario_nombre"],
                take: 5,
                orderBy: { fecha_emision: "desc" },
            }),
        ]);

        const sugerenciasClientes = clientes.map((c) => ({
            id_cliente: c.id_cliente,
            nombre: `${c.nombre} ${c.apellido}`.trim(),
            cuit: c.cuit || "",
            domicilio: c.calle ? `${c.calle} ${c.num_calle ?? ""}`.trim() : "",
            localidad: c.localidad || "",
            condicion_iva: "",
        }));

        const sugerenciasPresupuestos = presupuestosPrevios.map((p) => ({
            id_cliente: null,
            nombre: p.destinatario_nombre,
            cuit: p.destinatario_cuit || "",
            domicilio: p.destinatario_domicilio || "",
            localidad: p.destinatario_localidad || "",
            condicion_iva: p.destinatario_condicion_iva || "",
        }));

        return JSON.parse(JSON.stringify([...sugerenciasClientes, ...sugerenciasPresupuestos]));
    } catch (error) {
        console.error("Error searching destinatarios:", error);
        return [];
    }
}
