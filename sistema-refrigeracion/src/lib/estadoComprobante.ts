export const ESTADOS_COMPROBANTE = {
  IMPAGA: "IMPAGA",
  PARCIAL: "PARCIAL",
  PAGADA: "PAGADA",
  ANULADA: "ANULADA",
  NO_APLICA: "NO_APLICA",
} as const;

export type EstadoComprobante = (typeof ESTADOS_COMPROBANTE)[keyof typeof ESTADOS_COMPROBANTE];

export const TOLERANCIA_MONTO = 0.001;

export function calcularEstado(saldoPendiente: number, montoTotal: number): EstadoComprobante {
  if (saldoPendiente <= TOLERANCIA_MONTO) return ESTADOS_COMPROBANTE.PAGADA;
  if (saldoPendiente >= montoTotal - TOLERANCIA_MONTO) return ESTADOS_COMPROBANTE.IMPAGA;
  return ESTADOS_COMPROBANTE.PARCIAL;
}

// Tipos de comprobante (campo `comprobante.tipo`) que representan deuda real del
// cliente y por lo tanto llevan estado de pago y saldo. Todo lo que no está
// en esta lista es solo documentación (ej. Remito, Informe Tecnico) y se
// guarda con estado_pago = NO_APLICA y saldo_pendiente = 0.
//
// Nota: "Remito" NO es facturable: documenta una entrega, no una deuda. No
// genera saldo, no descuenta stock (eso lo hace solo la Comprobante) y no bloquea
// que la orden se facture después.
export const TIPOS_COMPROBANTE_FACTURABLE = ["Factura"] as const;

export function esTipoFacturable(tipo: string | null | undefined): boolean {
  return !!tipo && (TIPOS_COMPROBANTE_FACTURABLE as readonly string[]).includes(tipo);
}
