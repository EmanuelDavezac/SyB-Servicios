"use server";

import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { obtenerFacturasParaRecordatorio, tipoRecordatorio, inicioDelDiaUTC } from "@/lib/recordatorios";

const FROM = process.env.RESEND_FROM_EMAIL || "SyB Servicios <onboarding@resend.dev>";

let resendClient: Resend | null = null;
function getResend() {
    if (!resendClient) {
        if (!process.env.RESEND_API_KEY) {
            throw new Error("RESEND_API_KEY no esta configurada");
        }
        resendClient = new Resend(process.env.RESEND_API_KEY);
    }
    return resendClient;
}

function formatCurrency(n: number) {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);
}

function formatDate(d: Date) {
    return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
}

/**
 * Busca facturas por vencer, manda un recordatorio por email a cada cliente
 * via Resend, y deja constancia en historial_notificaciones (exito o error).
 * Un envio fallido no corta el resto del lote.
 */
export async function enviarRecordatoriosPendientes(diasAnticipacion: number = 3) {
    try {
        const facturas = await obtenerFacturasParaRecordatorio(diasAnticipacion);
        const tipo = tipoRecordatorio(diasAnticipacion);
        const hoy = inicioDelDiaUTC(new Date());

        let enviados = 0;
        let fallidos = 0;

        for (const factura of facturas) {
            const cliente = factura.orden_trabajo?.cliente;
            const idCliente = cliente?.id_cliente ?? null;

            if (!cliente?.email) {
                fallidos++;
                await registrarIntento({
                    id_factura: factura.id_factura,
                    id_cliente: idCliente,
                    tipo,
                    hoy,
                    estado: "ERROR",
                    descripcion: "El cliente no tiene email registrado",
                });
                continue;
            }

            const saldo = Number(factura.saldo_pendiente);
            const nombreCliente = `${cliente.nombre} ${cliente.apellido}`;
            const numComprobante = factura.num_factura || `Factura #${factura.id_factura}`;
            const vencimiento = factura.fecha_vencimiento ? formatDate(factura.fecha_vencimiento) : "sin fecha";

            try {
                const { error } = await getResend().emails.send({
                    from: FROM,
                    to: cliente.email,
                    subject: `Recordatorio de vencimiento - ${numComprobante}`,
                    html: `
                        <p>Hola ${nombreCliente},</p>
                        <p>Te recordamos que el comprobante <strong>${numComprobante}</strong> vence el <strong>${vencimiento}</strong>.</p>
                        <p>Saldo adeudado: <strong>${formatCurrency(saldo)}</strong></p>
                        <p>Gracias.</p>
                    `,
                });

                if (error) {
                    fallidos++;
                    await registrarIntento({
                        id_factura: factura.id_factura,
                        id_cliente: idCliente,
                        tipo,
                        hoy,
                        estado: "ERROR",
                        descripcion: error.message,
                    });
                } else {
                    enviados++;
                    await registrarIntento({
                        id_factura: factura.id_factura,
                        id_cliente: idCliente,
                        tipo,
                        hoy,
                        estado: "ENVIADO",
                        descripcion: `Enviado a ${cliente.email}`,
                    });
                }
            } catch (err) {
                fallidos++;
                await registrarIntento({
                    id_factura: factura.id_factura,
                    id_cliente: idCliente,
                    tipo,
                    hoy,
                    estado: "ERROR",
                    descripcion: err instanceof Error ? err.message : "Error desconocido al enviar el email",
                });
            }
        }

        return { success: true, total: facturas.length, enviados, fallidos };
    } catch (error) {
        console.error("Error enviando recordatorios:", error);
        return { success: false, error: error instanceof Error ? error.message : "Error al enviar recordatorios" };
    }
}

async function registrarIntento(datos: {
    id_factura: number;
    id_cliente: number | null;
    tipo: string;
    hoy: Date;
    estado: "ENVIADO" | "ERROR";
    descripcion: string;
}) {
    try {
        await prisma.historial_notificaciones.create({
            data: {
                id_factura: datos.id_factura,
                id_cliente: datos.id_cliente,
                tipo_notificacion: datos.tipo,
                fecha_creacion: datos.hoy,
                estado: datos.estado,
                descripcion: datos.descripcion,
            },
        });
    } catch (error) {
        // Choque contra el unique de dedupe (doble corrida el mismo dia) u otro error de escritura:
        // no relanzar, ya se intento avisar y no queremos cortar el resto del lote.
        console.error("Error registrando historial de notificacion:", error);
    }
}

export async function obtenerHistorialNotificaciones(filtros?: {
    id_cliente?: number;
    id_factura?: number;
    estado?: string;
}) {
    try {
        const notificaciones = await prisma.historial_notificaciones.findMany({
            where: {
                id_cliente: filtros?.id_cliente,
                id_factura: filtros?.id_factura,
                estado: filtros?.estado,
            },
            include: {
                cliente: true,
                factura: true,
            },
            orderBy: { fecha_creacion: "desc" },
        });
        return JSON.parse(JSON.stringify(notificaciones));
    } catch (error) {
        console.error("Error obteniendo historial de notificaciones:", error);
        return [];
    }
}
