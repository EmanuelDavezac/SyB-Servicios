const TOLERANCIA = 0.001;

export interface FacturaPendienteReparto {
    id_factura: number;
    saldo_pendiente: number | string;
}

export function distribuirCobro(facturasPendientes: FacturaPendienteReparto[], monto: number): Record<number, string> {
    let restante = monto || 0;
    const nuevasImputaciones: Record<number, string> = {};

    for (const factura of facturasPendientes) {
        if (restante <= TOLERANCIA) break;
        const saldo = Number(factura.saldo_pendiente);
        const aplicar = Math.min(saldo, restante);
        if (aplicar > TOLERANCIA) {
            nuevasImputaciones[factura.id_factura] = aplicar.toFixed(2);
            restante -= aplicar;
        }
    }

    return nuevasImputaciones;
}
