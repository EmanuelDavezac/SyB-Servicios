"use client";

import { useState, useTransition } from "react";
import ModalConfirmacion from "@/components/ModalConfirmacion";

interface ResultadoAccion {
    success: boolean;
    error?: string;
}

interface Props {
    id: number;
    nombre: string;
    estadoActual: boolean;
    /** Sustantivo en minúscula para los textos por default: "cliente", "servicio", "insumo", "proveedor" */
    entidad: string;
    darDeBaja: (id: number) => Promise<ResultadoAccion>;
    reactivar: (id: number) => Promise<ResultadoAccion>;
    /** Mensaje de confirmación de la baja; default genérico con `entidad` y `nombre` */
    mensajeBaja?: string;
    /** Mensaje de confirmación de la reactivación; default genérico con `entidad` y `nombre` */
    mensajeReactivar?: string;
}

/**
 * Botón de baja lógica / reactivación reutilizable: activo muestra "Dar de
 * baja", inactivo muestra "Reactivar", ambos con confirmación. Si la action
 * devuelve error (por ejemplo, un registro que todavía bloquea la baja), se
 * muestra dentro del modal de confirmación -que queda abierto para poder
 * leerlo- en vez de un alert().
 */
export default function BotonBajaEntidad({
    id,
    nombre,
    estadoActual,
    entidad,
    darDeBaja,
    reactivar,
    mensajeBaja,
    mensajeReactivar,
}: Props) {
    const [isPending, startTransition] = useTransition();
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const esBaja = estadoActual;

    function handleAbrir() {
        setError(null);
        setShowConfirm(true);
    }

    function handleCancelar() {
        setError(null);
        setShowConfirm(false);
    }

    function handleConfirmar() {
        startTransition(async () => {
            const res = esBaja ? await darDeBaja(id) : await reactivar(id);
            if (res?.success === false) {
                // El modal queda abierto para que se pueda leer el motivo (los
                // registros que todavía bloquean la baja, el saldo, etc).
                setError(res.error || `Hubo un error al cambiar el estado de ${entidad}.`);
                return;
            }
            setError(null);
            setShowConfirm(false);
        });
    }

    return (
        <>
            <button
                onClick={handleAbrir}
                disabled={isPending}
                className={esBaja ? "text-red-600 hover:text-red-800 transition-colors disabled:text-gray-400" : "text-green-600 hover:text-green-800 transition-colors disabled:text-gray-400"}
                title={esBaja ? `Dar de baja ${entidad}` : `Reactivar ${entidad}`}
            >
                <i className={esBaja ? "fas fa-ban" : "fas fa-undo"} />
            </button>

            <ModalConfirmacion
                isOpen={showConfirm}
                titulo={esBaja ? `Dar de baja ${entidad}` : `Reactivar ${entidad}`}
                mensaje={
                    esBaja
                        ? mensajeBaja ?? `¿Estás seguro de que querés dar de baja a ${nombre}?`
                        : mensajeReactivar ?? `¿Estás seguro de que querés reactivar a ${nombre}?`
                }
                labelConfirmar={esBaja ? "Dar de baja" : "Reactivar"}
                procesando={isPending}
                error={error}
                onConfirmar={handleConfirmar}
                onCancelar={handleCancelar}
            />
        </>
    );
}
