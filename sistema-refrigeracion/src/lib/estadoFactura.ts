export const ESTADOS_FACTURA = {
  IMPAGA: "IMPAGA",
  PARCIAL: "PARCIAL",
  PAGADA: "PAGADA",
  ANULADA: "ANULADA",
} as const;

export type EstadoFactura = (typeof ESTADOS_FACTURA)[keyof typeof ESTADOS_FACTURA];

export const TOLERANCIA_MONTO = 0.001;

export function calcularEstado(saldoPendiente: number, montoTotal: number): EstadoFactura {
  if (saldoPendiente <= TOLERANCIA_MONTO) return ESTADOS_FACTURA.PAGADA;
  if (saldoPendiente >= montoTotal - TOLERANCIA_MONTO) return ESTADOS_FACTURA.IMPAGA;
  return ESTADOS_FACTURA.PARCIAL;
}
