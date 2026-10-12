"use client";

import { useState, useTransition } from "react";
import { eliminarOrden } from "@/actions/ordenes";
import ModalConfirmacion from "@/components/ModalConfirmacion";

interface Props {
    idOrden: number;
    /** Número como se muestra en la tabla (ej. "00012") */
    numeroOrden: string;
    /** Si la orden tiene comprobantes, el botón queda deshabilitado con este motivo como title */
    motivoDeshabilitado?: string;
}

export default function BotonEliminarOrden({ idOrden, numeroOrden, motivoDeshabilitado }: Props) {
    const [isPending, startTransition] = useTransition();
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (motivoDeshabilitado) {
        return (
            <button
                className="text-gray-300 cursor-not-allowed ml-2"
                title={motivoDeshabilitado}
                disabled
            >
                <i className="fas fa-trash" />
            </button>
        );
    }

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
            const res = await eliminarOrden(idOrden);
            if (!res.success) {
                setError(res.error || "Hubo un error al eliminar la orden.");
                return;
            }
            setShowConfirm(false);
        });
    }

    return (
        <>
            <button
                onClick={handleAbrir}
                disabled={isPending}
                className="text-red-600 hover:text-red-800 transition-colors disabled:text-gray-400 ml-2"
                title="Eliminar orden"
            >
                <i className="fas fa-trash" />
            </button>

            <ModalConfirmacion
                isOpen={showConfirm}
                titulo="Eliminar orden"
                mensaje={`¿Eliminar la orden #${numeroOrden}? Se borrarán también los servicios e insumos cargados. Esta acción no se puede deshacer.`}
                labelConfirmar="Eliminar orden"
                procesando={isPending}
                error={error}
                onConfirmar={handleConfirmar}
                onCancelar={handleCancelar}
            />
        </>
    );
}
