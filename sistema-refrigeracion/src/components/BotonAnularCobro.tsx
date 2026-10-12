"use client";

import { useState, useTransition } from "react";
import { anularCobro } from "@/actions/cobros";
import ModalConfirmacion from "@/components/ModalConfirmacion";

interface Props {
    idRecibo: number;
}

export default function BotonAnularCobro({ idRecibo }: Props) {
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
            const resultado = await anularCobro(idRecibo);
            if (!resultado.success) {
                setError(resultado.error || "Error al anular el cobro.");
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
                title="Anular recibo"
                className="text-red-500 hover:text-red-700 transition disabled:opacity-50 text-sm font-medium"
            >
                {isPending ? "..." : "Anular"}
            </button>

            <ModalConfirmacion
                isOpen={showConfirm}
                titulo="Anular recibo"
                mensaje="¿Anular este recibo? Se recalculará el saldo de las facturas imputadas."
                labelConfirmar="Anular recibo"
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
