"use client";

import { useState, useTransition } from "react";
import { eliminarInsumo } from "@/actions/insumos";
import ModalConfirmacion from "@/components/ModalConfirmacion";

export default function BotonEliminarInsumo({ idInsumo }: { idInsumo: number }) {
    const [isPending, startTransition] = useTransition();
    const [showConfirm, setShowConfirm] = useState(false);

    function handleConfirmar() {
        startTransition(async () => {
            const res = await eliminarInsumo(idInsumo);
            if (res?.success === false) {
                alert(res.error || "Hubo un error al eliminar el insumo.");
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
                title="Eliminar insumo"
            >
                <i className="fas fa-trash" />
            </button>

            <ModalConfirmacion
                isOpen={showConfirm}
                titulo="Eliminar insumo"
                mensaje="¿Estás seguro de que querés eliminar este insumo? Esta acción no se puede deshacer."
                labelConfirmar="Eliminar insumo"
                procesando={isPending}
                onConfirmar={handleConfirmar}
                onCancelar={() => setShowConfirm(false)}
            />
        </>
    );
}
