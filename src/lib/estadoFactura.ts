export const ESTADOS_FACTURA = {
  IMPAGA: "IMPAGA",
  PARCIAL: "PARCIAL",
  PAGADA: "PAGADA",
  ANULADA: "ANULADA",
  NO_APLICA: "NO_APLICA",
} as const;

export type EstadoFactura = (typeof ESTADOS_FACTURA)[keyof typeof ESTADOS_FACTURA];

export const TOLERANCIA_MONTO = 0.001;

export function calcularEstado(saldoPendiente: number, montoTotal: number): EstadoFactura {
  if (saldoPendiente <= TOLERANCIA_MONTO) return ESTADOS_FACTURA.PAGADA;
  if (saldoPendiente >= montoTotal - TOLERANCIA_MONTO) return ESTADOS_FACTURA.IMPAGA;
  return ESTADOS_FACTURA.PARCIAL;
}

// Tipos de comprobante (campo `factura.tipo`) que representan deuda real del
// cliente y por lo tanto llevan estado de pago y saldo. Todo lo que no está
// en esta lista es solo documentación (ej. Informe Tecnico) y se guarda con
// estado_pago = NO_APLICA y saldo_pendiente = 0.
//
// Nota: "Remito" queda como facturable porque así viene funcionando, aunque
// es discutible (documenta una entrega, no una deuda, y si luego se emite la
// factura por la misma entrega la deuda del cliente se duplica). Sacarlo de
// acá es la única línea a tocar el día que se decida cambiar eso.
export const TIPOS_COMPROBANTE_FACTURABLE = ["Factura", "Remito"] as const;

export function esTipoFacturable(tipo: string | null | undefined): boolean {
  return !!tipo && (TIPOS_COMPROBANTE_FACTURABLE as readonly string[]).includes(tipo);
}
