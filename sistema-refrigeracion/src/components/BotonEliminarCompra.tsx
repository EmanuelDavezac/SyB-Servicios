"use client";

import { useState, useTransition } from "react";
import { eliminarCompra } from "@/actions/compras";
import ModalConfirmacion from "@/components/ModalConfirmacion";

export default function BotonEliminarCompra({ idCompra }: { idCompra: number }) {
    const [isPending, startTransition] = useTransition();
    const [showConfirm, setShowConfirm] = useState(false);

    function handleConfirmar() {
        startTransition(async () => {
            const res = await eliminarCompra(idCompra);
            if (res?.success === false) {
                alert(res.error || "Hubo un error al eliminar la compra.");
            }
            setShowConfirm(false);
        });
    }

    return (
        <>
            <button
                onClick={() => setShowConfirm(true)}
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
                onConfirmar={handleConfirmar}
                onCancelar={() => setShowConfirm(false)}
            />
        </>
    );
}
