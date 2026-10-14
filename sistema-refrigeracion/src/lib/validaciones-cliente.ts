// Reglas de validacion de los campos numericos del cliente. Se usan tanto en
// los modales (feedback inmediato) como en src/actions/clientes.ts (para que
// no se puedan saltear llamando la action directo).

export const MAX_NUM_CALLE = 99999;
export const MAX_CONDICION_PAGO_DIAS = 365;
export const MAX_DIGITOS_CUIT = 11;
export const MAX_DIGITOS_TELEFONO = 10;

function soloDigitos(valor: string) {
    return valor.replace(/\D/g, "");
}

/** Para el onChange del input: deja solo numeros y corta en el maximo permitido. */
export function limpiarCuit(valor: string) {
    return soloDigitos(valor).slice(0, MAX_DIGITOS_CUIT);
}

export function limpiarTelefono(valor: string) {
    return soloDigitos(valor).slice(0, MAX_DIGITOS_TELEFONO);
}

// CUIT/CUIL: 11 digitos con digito verificador modulo 11 (algoritmo AFIP).
function cuitDigitoVerificadorValido(digitos: string) {
    const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    const suma = pesos.reduce((acc, peso, i) => acc + peso * Number(digitos[i]), 0);
    const resto = 11 - (suma % 11);
    const esperado = resto === 11 ? 0 : resto;
    return esperado !== 10 && esperado === Number(digitos[10]);
}

/** Acepta DNI (7 u 8 digitos) o CUIT/CUIL (11 digitos), solo numeros. */
export function validarCuit(cuit: string): string | null {
    const valor = cuit.trim();
    if (!valor) return null;
    if (!/^\d+$/.test(valor)) return "El DNI/CUIT solo puede tener números.";
    const digitos = valor;
    if (digitos.length === 7 || digitos.length === 8) return null;
    if (digitos.length === 11) {
        return cuitDigitoVerificadorValido(digitos) ? null : "El CUIT no es válido (dígito verificador incorrecto).";
    }
    return "El DNI debe tener 7 u 8 dígitos y el CUIT 11.";
}

/** Entre 6 y 10 digitos, solo numeros. */
export function validarTelefono(telefono: string): string | null {
    const valor = telefono.trim();
    if (!valor) return null;
    if (!/^\d+$/.test(valor)) return "El teléfono solo puede tener números.";
    if (valor.length < 6 || valor.length > MAX_DIGITOS_TELEFONO) {
        return `El teléfono debe tener entre 6 y ${MAX_DIGITOS_TELEFONO} dígitos.`;
    }
    return null;
}

export function validarNumCalle(numCalle: number | undefined | null): string | null {
    if (numCalle == null) return null;
    if (!Number.isInteger(numCalle) || numCalle < 1 || numCalle > MAX_NUM_CALLE) {
        return `El número de calle debe ser un entero entre 1 y ${MAX_NUM_CALLE}.`;
    }
    return null;
}

export function validarCondicionPagoDias(dias: number | undefined | null): string | null {
    if (dias == null) return null;
    if (!Number.isInteger(dias) || dias < 0 || dias > MAX_CONDICION_PAGO_DIAS) {
        return `La condición de pago debe ser entre 0 y ${MAX_CONDICION_PAGO_DIAS} días.`;
    }
    return null;
}

/** Primer error encontrado en los campos numericos, o null si todo es valido. */
export function validarDatosNumericosCliente(datos: {
    cuit?: string;
    telefono?: string;
    num_calle?: number;
    condicion_pago_dias?: number;
}): string | null {
    return (
        validarCuit(datos.cuit ?? "") ??
        validarTelefono(datos.telefono ?? "") ??
        validarNumCalle(datos.num_calle) ??
        validarCondicionPagoDias(datos.condicion_pago_dias)
    );
}
