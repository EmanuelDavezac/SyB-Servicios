const UNIDADES = [
    "", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE", "DIEZ",
    "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISEIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE", "VEINTE",
];

const VEINTI = [
    "", "VEINTIUNO", "VEINTIDOS", "VEINTITRES", "VEINTICUATRO", "VEINTICINCO",
    "VEINTISEIS", "VEINTISIETE", "VEINTIOCHO", "VEINTINUEVE",
];

const DECENAS = ["", "", "", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];

const CENTENAS = [
    "", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS",
    "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS",
];

function convertirGrupo(n: number): string {
    if (n === 0) return "";
    if (n === 100) return "CIEN";

    const centena = Math.floor(n / 100);
    const resto = n % 100;
    const partes: string[] = [];

    if (centena > 0) partes.push(CENTENAS[centena]);

    if (resto > 0) {
        if (resto <= 20) {
            partes.push(UNIDADES[resto]);
        } else if (resto <= 29) {
            partes.push(VEINTI[resto - 20]);
        } else {
            const decena = Math.floor(resto / 10);
            const unidad = resto % 10;
            partes.push(unidad > 0 ? `${DECENAS[decena]} Y ${UNIDADES[unidad]}` : DECENAS[decena]);
        }
    }

    return partes.join(" ");
}

function apocopar(palabras: string): string {
    if (palabras.endsWith("VEINTIUNO")) {
        return palabras.slice(0, -"VEINTIUNO".length) + "VEINTIÚN";
    }
    if (palabras.endsWith("UNO")) {
        return palabras.slice(0, -"UNO".length) + "UN";
    }
    return palabras;
}

function numeroEnteroALetras(n: number): string {
    if (n === 0) return "CERO";

    const millones = Math.floor(n / 1000000);
    const miles = Math.floor((n % 1000000) / 1000);
    const cientos = n % 1000;

    const partes: string[] = [];

    if (millones > 0) {
        partes.push(millones === 1 ? "UN MILLÓN" : `${apocopar(convertirGrupo(millones))} MILLONES`);
    }

    if (miles > 0) {
        partes.push(miles === 1 ? "MIL" : `${apocopar(convertirGrupo(miles))} MIL`);
    }

    if (cientos > 0) {
        partes.push(apocopar(convertirGrupo(cientos)));
    }

    return partes.join(" ");
}

export function montoALetras(monto: number): string {
    const totalCentavos = Math.round(monto * 100);
    const entero = Math.floor(totalCentavos / 100);
    const centavos = totalCentavos % 100;

    return `SON PESOS ${numeroEnteroALetras(entero)} CON ${String(centavos).padStart(2, "0")}/100`;
}
