import { prisma } from "@/lib/prisma";
import { ESTADOS_FACTURA } from "@/lib/estadoFactura";

export function tipoRecordatorio(diasAnticipacion: number) {
    return `RECORDATORIO_${diasAnticipacion}D`;
}

// UTC porque tanto Vercel (cron) como Neon (columna `date`) corren en UTC.
export function inicioDelDiaUTC(fecha: Date) {
    const d = new Date(fecha);
    d.setUTCHours(0, 0, 0, 0);
    return d;
}

/**
 * Facturas IMPAGA/PARCIAL cuyo vencimiento cae entre hoy y hoy + diasAnticipacion
 * (inclusive), y que todavia no tienen un recordatorio de este tipo registrado hoy.
 */
export async function obtenerFacturasParaRecordatorio(diasAnticipacion: number) {
    const hoy = inicioDelDiaUTC(new Date());
    const limite = new Date(hoy);
    limite.setUTCDate(limite.getUTCDate() + diasAnticipacion);
    limite.setUTCHours(23, 59, 59, 999);

    const tipo = tipoRecordatorio(diasAnticipacion);

    const facturas = await prisma.factura.findMany({
        where: {
            estado_pago: { in: [ESTADOS_FACTURA.IMPAGA, ESTADOS_FACTURA.PARCIAL] },
            fecha_vencimiento: { gte: hoy, lte: limite },
            historial_notificaciones: {
                none: {
                    tipo_notificacion: tipo,
                    fecha_creacion: hoy,
                },
            },
        },
        include: {
            orden_trabajo: { include: { cliente: true } },
        },
        orderBy: { fecha_vencimiento: "asc" },
    });

    return facturas;
}
