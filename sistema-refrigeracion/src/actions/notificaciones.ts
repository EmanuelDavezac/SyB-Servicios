"use server";

import { requerirUsuario } from "@/lib/sesion";
import { prisma } from "@/lib/prisma";
import { procesarRecordatorios } from "@/lib/recordatorios";

/**
 * Uso manual (desde la UI, con un usuario logueado). El envio real -sin
 * chequeo de sesion, porque tambien lo llama el cron sin usuario detras- vive
 * en src/lib/recordatorios.ts (procesarRecordatorios). Esta funcion es
 * "use server", o sea un endpoint publico: todo lo que haga sin
 * requerirUsuario() primero queda invocable por cualquiera.
 */
export async function enviarRecordatoriosPendientes(diasAnticipacion: number = 3) {
    try {
        await requerirUsuario();
        const resultado = await procesarRecordatorios(diasAnticipacion);
        return { success: true, ...resultado };
    } catch (error) {
        console.error("Error enviando recordatorios:", error);
        return { success: false, error: error instanceof Error ? error.message : "Error al enviar recordatorios" };
    }
}

export async function obtenerHistorialNotificaciones(filtros?: {
    id_cliente?: number;
    id_comprobante?: number;
    estado?: string;
}) {
    try {
        await requerirUsuario();
        const notificaciones = await prisma.historial_notificaciones.findMany({
            where: {
                id_cliente: filtros?.id_cliente,
                id_comprobante: filtros?.id_comprobante,
                estado: filtros?.estado,
            },
            include: {
                cliente: true,
                comprobante: true,
            },
            orderBy: { fecha_creacion: "desc" },
        });
        return JSON.parse(JSON.stringify(notificaciones));
    } catch (error) {
        console.error("Error obteniendo historial de notificaciones:", error);
        return [];
    }
}
