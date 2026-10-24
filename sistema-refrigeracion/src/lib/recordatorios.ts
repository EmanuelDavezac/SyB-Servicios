import "server-only";

import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { ESTADOS_COMPROBANTE } from "@/lib/estadoComprobante";
import { fechaActualArgentina } from "@/lib/fechas";

// Este modulo NO es "use server": todo lo exportado desde un archivo
// "use server" queda expuesto como endpoint publico invocable por fetch, y
// procesarRecordatorios() no valida sesion (lo llama el cron, que no tiene
// cookie). El import de arriba hace que Next tire error de build si algun
// client component llega a importar este archivo por error.

const FROM = process.env.RESEND_FROM_EMAIL || "SyB Servicios <onboarding@resend.dev>";

// Reintentos dentro de una misma corrida si Resend falla (error de API o
// excepcion). Esperas cortas a proposito: la funcion del cron tiene un
// timeout y esto corre en loop por cada comprobante del lote.
const MAX_INTENTOS = 3;
const ESPERAS_REINTENTO_MS = [1000, 3000];

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

export function tipoRecordatorio(diasAnticipacion: number) {
    return `RECORDATORIO_${diasAnticipacion}D`;
}

/**
 * Rango de fecha_vencimiento (ambos limites inclusive, UTC) que le toca a un
 * aviso dado "hoy". El 0D es solo el dia de hoy. El resto (3D) arranca manana
 * y llega hasta hoy + diasAnticipacion: nunca incluye hoy, porque ese dia ya
 * le toca el 0D (si el 3D no salio antes, no se manda mas, se manda el 0D).
 */
export function rangoVencimiento(diasAnticipacion: number, hoy: Date) {
    const inicio = new Date(hoy);
    if (diasAnticipacion > 0) inicio.setUTCDate(inicio.getUTCDate() + 1);

    const fin = new Date(hoy);
    fin.setUTCDate(fin.getUTCDate() + diasAnticipacion);
    fin.setUTCHours(23, 59, 59, 999);

    return { inicio, fin };
}

/**
 * Comprobantes IMPAGA/PARCIAL cuyo vencimiento cae en el rango que le toca a este
 * aviso, y que todavia no tienen un recordatorio de este tipo marcado como
 * ENVIADO (en cualquier fecha: un ERROR o NO_NOTIFICABLE de un dia anterior
 * no cuenta como avisado, se vuelve a intentar).
 */
export async function obtenerComprobantesParaRecordatorio(diasAnticipacion: number, hoy: Date) {
    const tipo = tipoRecordatorio(diasAnticipacion);
    const { inicio, fin } = rangoVencimiento(diasAnticipacion, hoy);

    return prisma.comprobante.findMany({
        where: {
            estado_pago: { in: [ESTADOS_COMPROBANTE.IMPAGA, ESTADOS_COMPROBANTE.PARCIAL] },
            fecha_vencimiento: { gte: inicio, lte: fin },
            historial_notificaciones: {
                none: {
                    tipo_notificacion: tipo,
                    estado: "ENVIADO",
                },
            },
        },
        include: {
            orden_trabajo: { include: { cliente: true } },
        },
        orderBy: { fecha_vencimiento: "asc" },
    });
}

function formatCurrency(n: number) {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);
}

function formatDate(d: Date) {
    return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
}

function esperar(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// "Intento N: ..." / "Enviado a x@y en el intento N" -> N. Permite que el
// contador de intentos del dia siga acumulando entre corridas (el cron pasa
// cada hora y cada corrida solo ve el ultimo registro del dia).
function extraerIntentoPrevio(descripcion: string | null | undefined): number {
    const match = descripcion?.match(/intento (\d+)/i);
    return match ? Number(match[1]) : 0;
}

interface ResultadoEnvio {
    estado: "ENVIADO" | "ERROR";
    descripcion: string;
}

async function enviarConReintentos(params: {
    email: string;
    asunto: string;
    html: string;
    intentoInicial: number;
}): Promise<ResultadoEnvio> {
    let intento = params.intentoInicial;
    let resultado: ResultadoEnvio = { estado: "ERROR", descripcion: "No se intento el envio" };

    for (let i = 0; i < MAX_INTENTOS; i++) {
        intento++;
        try {
            const { error } = await getResend().emails.send({
                from: FROM,
                to: params.email,
                subject: params.asunto,
                html: params.html,
            });

            if (!error) {
                resultado = { estado: "ENVIADO", descripcion: `Enviado a ${params.email} en el intento ${intento}` };
                break;
            }
            resultado = { estado: "ERROR", descripcion: `Intento ${intento}: ${error.message}` };
        } catch (err) {
            resultado = {
                estado: "ERROR",
                descripcion: `Intento ${intento}: ${err instanceof Error ? err.message : "Error desconocido al enviar el email"}`,
            };
        }

        const esperaMs = ESPERAS_REINTENTO_MS[i];
        if (i < MAX_INTENTOS - 1 && esperaMs) {
            await esperar(esperaMs);
        }
    }

    return resultado;
}

async function registrarIntento(datos: {
    id_comprobante: number;
    id_cliente: number | null;
    tipo: string;
    hoy: Date;
    estado: "ENVIADO" | "ERROR" | "NO_NOTIFICABLE";
    descripcion: string;
}) {
    try {
        // Upsert sobre el unique (id_comprobante, tipo_notificacion, fecha_creacion):
        // una sola fila por comprobante+aviso+dia, que se va actualizando con el
        // resultado del ultimo intento (no se puede insertar una fila nueva por
        // intento, el unique de dedupe no lo permite ni hace falta migracion).
        await prisma.historial_notificaciones.upsert({
            where: {
                id_comprobante_tipo_notificacion_fecha_creacion: {
                    id_comprobante: datos.id_comprobante,
                    tipo_notificacion: datos.tipo,
                    fecha_creacion: datos.hoy,
                },
            },
            create: {
                id_comprobante: datos.id_comprobante,
                id_cliente: datos.id_cliente,
                tipo_notificacion: datos.tipo,
                fecha_creacion: datos.hoy,
                estado: datos.estado,
                descripcion: datos.descripcion,
            },
            update: {
                id_cliente: datos.id_cliente,
                estado: datos.estado,
                descripcion: datos.descripcion,
            },
        });
    } catch (error) {
        console.error("Error registrando historial de notificacion:", error);
    }
}

export interface ResumenRecordatorios {
    total: number;
    enviados: number;
    fallidos: number;
    omitidos: number;
}

/**
 * Busca comprobantes por vencer para el aviso `diasAnticipacion` (3 o 0) y manda
 * el recordatorio por email a cada cliente via Resend, reintentando hasta
 * MAX_INTENTOS veces por comprobante antes de darse por vencido en esta corrida.
 * Deja constancia en historial_notificaciones (ENVIADO, ERROR o
 * NO_NOTIFICABLE). No depende de sesion: la llama tanto el cron (sin
 * usuario logueado) como la action manual, que valida sesion antes de
 * delegar aca.
 */
export async function procesarRecordatorios(
    diasAnticipacion: number,
    hoy: Date = fechaActualArgentina()
): Promise<ResumenRecordatorios> {
    const tipo = tipoRecordatorio(diasAnticipacion);
    const comprobantes = await obtenerComprobantesParaRecordatorio(diasAnticipacion, hoy);

    let enviados = 0;
    let fallidos = 0;
    let omitidos = 0;

    for (const comprobante of comprobantes) {
        const cliente = comprobante.orden_trabajo?.cliente;
        const idCliente = cliente?.id_cliente ?? null;

        if (!cliente?.email) {
            omitidos++;
            await registrarIntento({
                id_comprobante: comprobante.id_comprobante,
                id_cliente: idCliente,
                tipo,
                hoy,
                estado: "NO_NOTIFICABLE",
                descripcion: "El cliente no tiene email registrado",
            });
            continue;
        }

        // Re-chequeo anti-duplicado: si otra corrida (cron solapado) ya mando
        // este mismo aviso mientras se armaba el lote, no reenviar.
        const yaEnviado = await prisma.historial_notificaciones.findFirst({
            where: { id_comprobante: comprobante.id_comprobante, tipo_notificacion: tipo, estado: "ENVIADO" },
            select: { id_notificacion: true },
        });
        if (yaEnviado) continue;

        const registroDeHoy = await prisma.historial_notificaciones.findUnique({
            where: {
                id_comprobante_tipo_notificacion_fecha_creacion: {
                    id_comprobante: comprobante.id_comprobante,
                    tipo_notificacion: tipo,
                    fecha_creacion: hoy,
                },
            },
            select: { descripcion: true },
        });
        const intentoInicial = extraerIntentoPrevio(registroDeHoy?.descripcion);

        const nombreCliente = `${cliente.nombre} ${cliente.apellido}`;
        const numComprobante = comprobante.num_comprobante || `Comprobante #${comprobante.id_comprobante}`;
        const saldo = Number(comprobante.saldo_pendiente);
        const vencimientoTexto =
            diasAnticipacion === 0 ? "hoy" : `el ${formatDate(comprobante.fecha_vencimiento!)}`;

        const resultado = await enviarConReintentos({
            email: cliente.email,
            intentoInicial,
            asunto: `Recordatorio de vencimiento - ${numComprobante}`,
            html: `
                <p>Hola ${nombreCliente},</p>
                <p>Te recordamos que el comprobante <strong>${numComprobante}</strong> vence ${vencimientoTexto}.</p>
                <p>Saldo adeudado: <strong>${formatCurrency(saldo)}</strong></p>
                <p>Gracias.</p>
            `,
        });

        if (resultado.estado === "ENVIADO") enviados++;
        else fallidos++;

        await registrarIntento({
            id_comprobante: comprobante.id_comprobante,
            id_cliente: idCliente,
            tipo,
            hoy,
            estado: resultado.estado,
            descripcion: resultado.descripcion,
        });
    }

    return { total: comprobantes.length, enviados, fallidos, omitidos };
}
