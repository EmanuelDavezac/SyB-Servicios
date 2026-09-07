export function calcularTotales(lineas: { cantidad: unknown; precio_unitario: unknown }[], alicuota_iva: unknown) {
    const subtotal = lineas.reduce((acc, l) => acc + Number(l.cantidad) * Number(l.precio_unitario), 0);
    const monto_iva = subtotal * (Number(alicuota_iva) / 100);
    const total = subtotal + monto_iva;
    return { subtotal, monto_iva, total };
}

export function calcularVencimiento(fecha_emision: Date, validez_dias: number) {
    const vencimiento = new Date(fecha_emision);
    vencimiento.setDate(vencimiento.getDate() + validez_dias);
    return vencimiento;
}
