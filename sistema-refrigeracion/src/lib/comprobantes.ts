export interface CalcularImportesInput {
  neto: number;
  alicuotaIva: number;
  tipoDescuento?: "PORCENTAJE" | "EQUIPO" | null;
  descuentoPorcentaje?: number | null;
  descuentoMontoEquipo?: number | null;
  equipoDescripcion?: string | null;
  facturable: boolean;
}

export interface ImportesComprobante {
  descuentoMonto: number | null;
  netoGravado: number;
  montoTotal: number;
}

export function calcularImportes({
  neto,
  alicuotaIva,
  tipoDescuento,
  descuentoPorcentaje,
  descuentoMontoEquipo,
  equipoDescripcion,
  facturable,
}: CalcularImportesInput): ImportesComprobante {
  let descuentoMonto: number | null = null;
  let netoGravado = 0;
  let montoTotal = 0;

  if (facturable) {
    const netoBruto = neto;

    if (tipoDescuento === "PORCENTAJE") {
      const pct = descuentoPorcentaje ?? null;
      if (pct === null || pct < 0 || pct > 100) {
        throw new Error("El porcentaje de descuento debe estar entre 0 y 100.");
      }
      descuentoMonto = netoBruto * pct / 100;
    } else if (tipoDescuento === "EQUIPO") {
      if (!equipoDescripcion?.trim()) {
        throw new Error("Debe indicar qué equipo entrega el cliente en parte de pago.");
      }
      const imp = descuentoMontoEquipo ?? null;
      if (imp === null || imp <= 0) {
        throw new Error("El importe del equipo debe ser mayor a cero.");
      }
      if (imp >= netoBruto) {
        throw new Error("El descuento no puede igualar o superar el subtotal de la factura.");
      }
      descuentoMonto = imp;
    }

    netoGravado = netoBruto - (descuentoMonto ?? 0);
    montoTotal = netoGravado + netoGravado * (alicuotaIva / 100);
  }

  return { descuentoMonto, netoGravado, montoTotal };
}
