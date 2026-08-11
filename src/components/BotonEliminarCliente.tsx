"use client";

import { useState, useTransition } from "react";
import { eliminarCliente } from "@/actions/clientes";
import ModalConfirmacion from "@/components/ModalConfirmacion";

export default function BotonEliminarCliente({ idCliente, nombreCliente }: { idCliente: number; nombreCliente: string }) {
    const [isPending, startTransition] = useTransition();
    const [showConfirm, setShowConfirm] = useState(false);

    function handleConfirmar() {
        startTransition(async () => {
            const res = await eliminarCliente(idCliente);
            if (res?.success === false) {
                alert(res.error || "Hubo un error al eliminar el cliente.");
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
                title="Dar de baja cliente"
            >
                <i className="fas fa-trash" />
            </button>

            <ModalConfirmacion
                isOpen={showConfirm}
                titulo="Eliminar cliente"
                mensaje={`¿Estás seguro de que querés eliminar a ${nombreCliente}? Esta acción no se puede deshacer.`}
                labelConfirmar="Eliminar cliente"
                procesando={isPending}
                onConfirmar={handleConfirmar}
                onCancelar={() => setShowConfirm(false)}
            />
        </>
    );
}
