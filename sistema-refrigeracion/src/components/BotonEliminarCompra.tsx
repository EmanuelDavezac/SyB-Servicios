"use client";

import { useState, useTransition } from "react";
import { eliminarCompra } from "@/actions/compras";
import ModalConfirmacion from "@/components/ModalConfirmacion";

export default function BotonEliminarCompra({ idCompra }: { idCompra: number }) {
    const [isPending, startTransition] = useTransition();
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
            const res = await eliminarCompra(idCompra);
            if (res?.success === false) {
                setError(res.error || "Hubo un error al eliminar la compra.");
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
                className="text-red-600 hover:text-red-800 transition-colors disabled:text-gray-400"
                title="Eliminar compra"
            >
                <i className="fas fa-trash" />
            </button>

            <ModalConfirmacion
                isOpen={showConfirm}
                titulo="Eliminar compra"
                mensaje="¿Estás seguro de que querés eliminar esta compra? Se revertirá el stock sumado por sus insumos. Esta acción no se puede deshacer."
                labelConfirmar="Eliminar compra"
                procesando={isPending}
                error={error}
                onConfirmar={handleConfirmar}
                onCancelar={handleCancelar}
            />
        </>
    );
}
