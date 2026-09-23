export interface LineaImporte {
  /** cantidad * precio de la linea, antes de descuento e IVA */
  neto: number;
  /** alicuota de IVA de la linea, en porcentaje (ej. 21, 10.5) */
  alicuota: number;
}

export interface CalcularImportesInput {
  lineas: LineaImporte[];
  tipoDescuento?: "PORCENTAJE" | "EQUIPO" | null;
  descuentoPorcentaje?: number | null;
  descuentoMontoEquipo?: number | null;
  equipoDescripcion?: string | null;
  facturable: boolean;
}

export interface DesgloseIva {
  alicuota: number;
  /** neto de las lineas con esta alicuota, ya descontada su parte del descuento */
  netoGravado: number;
  montoIva: number;
}

export interface ImportesComprobante {
  netoBruto: number;
  descuentoMonto: number | null;
  netoGravado: number;
  desglose: DesgloseIva[];
  montoIva: number;
  montoTotal: number;
}

export const ALICUOTAS_IVA_SUGERIDAS = [0, 10.5, 21, 27] as const;
export const ALICUOTA_IVA_DEFAULT = 21;

export const redondear2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function alicuotaValida(alicuota: number): boolean {
  return Number.isFinite(alicuota) && alicuota >= 0 && alicuota <= 100;
}

// El calculo es el mismo para facturas fiscales (ARCA) e internas: la unica
// diferencia entre ambas es si se declaran, no cuanto se cobra.
export function calcularImportes({
  lineas,
  tipoDescuento,
  descuentoPorcentaje,
  descuentoMontoEquipo,
  equipoDescripcion,
  facturable,
}: CalcularImportesInput): ImportesComprobante {
  if (!facturable) {
    return { netoBruto: 0, descuentoMonto: null, netoGravado: 0, desglose: [], montoIva: 0, montoTotal: 0 };
  }

  // Agrupar las lineas por alicuota
  const brutoPorAlicuota = new Map<number, number>();
  for (const linea of lineas) {
    if (!alicuotaValida(linea.alicuota)) {
      throw new Error("La alícuota de IVA debe estar entre 0 y 100.");
    }
    const alicuota = redondear2(linea.alicuota);
    brutoPorAlicuota.set(alicuota, (brutoPorAlicuota.get(alicuota) ?? 0) + linea.neto);
  }
  const grupos = Array.from(brutoPorAlicuota.entries())
    .map(([alicuota, bruto]) => ({ alicuota, bruto: redondear2(bruto) }))
    .filter((g) => g.bruto !== 0)
    .sort((a, b) => b.alicuota - a.alicuota);

  const netoBruto = redondear2(grupos.reduce((acc, g) => acc + g.bruto, 0));

  let descuentoMonto: number | null = null;
  if (tipoDescuento === "PORCENTAJE") {
    const pct = descuentoPorcentaje ?? null;
    if (pct === null || pct < 0 || pct > 100) {
      throw new Error("El porcentaje de descuento debe estar entre 0 y 100.");
    }
    descuentoMonto = redondear2(netoBruto * pct / 100);
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
    descuentoMonto = redondear2(imp);
  }

  // El descuento se reparte entre las alicuotas en proporcion al neto de
  // cada una. El grupo de mayor neto absorbe la diferencia de redondeo para
  // que la suma de descuentos sea exactamente descuentoMonto.
  const descuento = descuentoMonto ?? 0;
  const descuentos = grupos.map((g) => (netoBruto > 0 ? redondear2(descuento * g.bruto / netoBruto) : 0));
  if (grupos.length > 0) {
    let idxMayor = 0;
    grupos.forEach((g, i) => { if (g.bruto > grupos[idxMayor].bruto) idxMayor = i; });
    const repartido = descuentos.reduce((acc, d, i) => (i === idxMayor ? acc : acc + d), 0);
    descuentos[idxMayor] = redondear2(descuento - repartido);
  }

  const desglose: DesgloseIva[] = grupos.map((g, i) => {
    const netoGravado = redondear2(g.bruto - descuentos[i]);
    return { alicuota: g.alicuota, netoGravado, montoIva: redondear2(netoGravado * g.alicuota / 100) };
  });

  const netoGravado = redondear2(desglose.reduce((acc, d) => acc + d.netoGravado, 0));
  const montoIva = redondear2(desglose.reduce((acc, d) => acc + d.montoIva, 0));
  const montoTotal = redondear2(netoGravado + montoIva);

  return { netoBruto, descuentoMonto, netoGravado, desglose, montoIva, montoTotal };
}

/** "10.5" -> "10,5" para mostrar alicuotas en pantalla/impresion */
export function formatearAlicuota(alicuota: number): string {
  return String(redondear2(alicuota)).replace(".", ",");
}
