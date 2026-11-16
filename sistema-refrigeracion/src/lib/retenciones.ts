import { redondear2 } from "@/lib/comprobantes";

export interface ComprobanteParaRetencion {
  monto_total: number | string;
  /** Comprobantes anteriores al IVA por linea: alicuota unica */
  alicuota_iva?: number | string | null;
  /** IVA discriminado por alicuota (comprobante_iva) */
  comprobante_iva?: { monto_iva: number | string }[] | null;
}

export interface ParteImputada {
  imputado: number;
  /** IVA contenido por cada peso del total del comprobante (ej. 21/121 con IVA 21%) */
  ratioIva: number;
}

/**
 * IVA contenido por peso del total del comprobante. Con una sola alicuota es
 * a / (100 + a); con IVA mixto es el IVA total sobre el monto total, que da el
 * mismo resultado que dividir por (1 + alicuota efectiva).
 */
export function ratioIvaDeComprobante(c: ComprobanteParaRetencion): number {
  const total = Number(c.monto_total);
  if (!Number.isFinite(total) || total <= 0) return 0;
  const filas = c.comprobante_iva ?? [];
  if (filas.length > 0) {
    const iva = filas.reduce((acc, f) => acc + (Number(f.monto_iva) || 0), 0);
    return Math.min(1, Math.max(0, iva / total));
  }
  const alicuota = c.alicuota_iva !== null && c.alicuota_iva !== undefined ? Number(c.alicuota_iva) : 0;
  return Number.isFinite(alicuota) && alicuota > 0 ? alicuota / (100 + alicuota) : 0;
}

/**
 * Retencion sobre lo imputado (no sobre el total de la factura).
 * - IVA: lo imputado (con IVA incluido) * porcentaje / 100.
 * - Ganancias / IIBB / SUSS: neto de IVA de lo imputado * porcentaje / 100, o
 *   sea imputado / (1 + alicuota) * porcentaje / 100.
 * Se suma sin redondear comprobante por comprobante y se redondea una sola vez.
 */
export function calcularRetencion(tipo: string, partes: ParteImputada[], porcentaje: number): number {
  if (!Number.isFinite(porcentaje) || porcentaje < 0) return 0;
  let base = 0;
  for (const { imputado, ratioIva } of partes) {
    if (!(imputado > 0)) continue;
    base += tipo === "IVA" ? imputado : imputado * (1 - ratioIva);
  }
  return redondear2((base * porcentaje) / 100);
}

/** "10,5" / "2" -> 10.5 / 2; vacio -> null; no numerico -> NaN */
export function parsearPorcentaje(texto: string): number | null {
  const t = texto.trim().replace(",", ".");
  if (t === "") return null;
  return /^\d*\.?\d*$/.test(t) ? parseFloat(t) : NaN;
}

export function porcentajeValido(p: number | null): boolean {
  return p === null || (Number.isFinite(p) && p >= 0 && p <= 100);
}
