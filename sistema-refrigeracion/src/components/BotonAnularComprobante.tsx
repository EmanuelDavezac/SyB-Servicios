"use client";

import { useState, useTransition } from "react";
import { anularComprobante } from "@/actions/cobros";
import ModalConfirmacion from "@/components/ModalConfirmacion";

interface Props {
    idComprobante: number;
}

export default function BotonAnularComprobante({ idComprobante }: Props) {
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
            const resultado = await anularComprobante(idComprobante);
            if (!resultado.success) {
                setError(resultado.error || "Error al anular el comprobante.");
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
                title="Anular comprobante"
                className="text-red-500 hover:text-red-700 transition disabled:opacity-50"
            >
                {isPending ? "..." : <i className="fas fa-ban"></i>}
            </button>

            <ModalConfirmacion
                isOpen={showConfirm}
                titulo="Anular comprobante"
                mensaje="¿Anular este comprobante? Se devolverá al stock los insumos descontados."
                labelConfirmar="Anular comprobante"
                labelProcesando="Anulando..."
                iconoConfirmar="fa-ban"
                procesando={isPending}
                error={error}
                onConfirmar={handleConfirmar}
                onCancelar={handleCancelar}
            />
        </>
    );
}
