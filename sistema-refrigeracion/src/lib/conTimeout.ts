// Corta la espera de una promesa (tipicamente una server action) que no
// responde. Sin esto, un pedido que se queda colgado (conexion cortada, base
// que no contesta) deja el boton en "Guardando..." para siempre.
//
// Ojo: solo corta la espera en el navegador. El pedido puede haber llegado al
// servidor y terminar igual, por eso el mensaje pide revisar el listado antes
// de reintentar.

export const TIMEOUT_ACCION_MS = 30_000;

export class ErrorTimeout extends Error {
    constructor() {
        super("El servidor tardó demasiado en responder.");
        this.name = "ErrorTimeout";
    }
}

export function conTimeout<T>(promesa: Promise<T>, ms: number = TIMEOUT_ACCION_MS): Promise<T> {
    let timer: ReturnType<typeof setTimeout>;
    const limite = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new ErrorTimeout()), ms);
    });
    return Promise.race([promesa, limite]).finally(() => clearTimeout(timer));
}

/** Mensaje para la UI cuando una action tira o no responde (no cuando devuelve success: false). */
export function mensajeErrorDeRed(error: unknown, queSeGuardaba: string): string {
    if (error instanceof ErrorTimeout) {
        return `El servidor tardó demasiado en responder. Puede que ${queSeGuardaba} se haya guardado igual: cerrá esta ventana y revisá el listado antes de volver a intentar.`;
    }
    return `No se pudo conectar con el servidor para guardar ${queSeGuardaba}. Revisá tu conexión y probá de nuevo.`;
}
