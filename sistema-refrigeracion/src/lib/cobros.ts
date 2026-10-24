const TOLERANCIA = 0.001;

export interface ComprobantePendienteReparto {
    id_comprobante: number;
    saldo_pendiente: number | string;
}

export function distribuirCobro(comprobantesPendientes: ComprobantePendienteReparto[], monto: number): Record<number, string> {
    let restante = monto || 0;
    const nuevasImputaciones: Record<number, string> = {};

    for (const comprobante of comprobantesPendientes) {
        if (restante <= TOLERANCIA) break;
        const saldo = Number(comprobante.saldo_pendiente);
        const aplicar = Math.min(saldo, restante);
        if (aplicar > TOLERANCIA) {
            nuevasImputaciones[comprobante.id_comprobante] = aplicar.toFixed(2);
            restante -= aplicar;
        }
    }

    return nuevasImputaciones;
}

export interface MedioDePago {
    forma_pago: string;
    monto: number | string;
}

/**
 * Texto combinado de los medios de pago de un recibo, ej. "Efectivo ($500,00)
 * + Transferencia ($300,00)". Si el recibo no tiene desglose estructurado
 * (recibo_medio_pago vacio: un recibo viejo, de antes de poder combinar
 * medios), cae al campo de texto libre forma_pago que tenia antes.
 */
export function formatearMediosDePago(medios: MedioDePago[], formaPagoLegacy?: string | null): string {
    if (medios.length === 0) {
        return formaPagoLegacy || "-";
    }
    if (medios.length === 1) {
        return medios[0].forma_pago;
    }
    const formatMoney = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);
    return medios.map((m) => `${m.forma_pago} (${formatMoney(Number(m.monto))})`).join(" + ");
}
