export function fechaActualArgentina(): Date {
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Argentina/Buenos_Aires",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
    
    const parts = formatter.formatToParts(new Date());
    const y = parts.find((p) => p.type === "year")!.value;
    const m = parts.find((p) => p.type === "month")!.value;
    const d = parts.find((p) => p.type === "day")!.value;
    
    return new Date(`${y}-${m}-${d}T00:00:00.000Z`);
}

// Dias de calendario desde `hoy` (por defecto la fecha actual en Argentina,
// como medianoche UTC) hasta `fecha`. Las columnas @db.Date llegan como
// medianoche UTC, asi que se compara todo en UTC: con setHours locales, en
// UTC-3 la fecha de vencimiento caia al dia anterior. Negativo = ya paso.
export function diasHastaFecha(fecha: string | Date, hoy: Date = fechaActualArgentina()): number {
    const f = new Date(fecha);
    const objetivo = Date.UTC(f.getUTCFullYear(), f.getUTCMonth(), f.getUTCDate());
    const base = Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate());
    return Math.round((objetivo - base) / (1000 * 3600 * 24));
}

export function formatFechaUTC(date: string | Date | null): string {
    if (!date) return "-";
    const d = new Date(date);
    return d.toLocaleDateString("es-AR", { timeZone: "UTC" });
}
