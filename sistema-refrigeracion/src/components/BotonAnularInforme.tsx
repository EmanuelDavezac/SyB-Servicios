"use client";

import { useState, useTransition } from "react";
import { anularInformeTecnico } from "@/actions/informesTecnicos";
import ModalConfirmacion from "@/components/ModalConfirmacion";

interface Props {
    idInforme: number;
}

export default function BotonAnularInforme({ idInforme }: Props) {
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
            const resultado = await anularInformeTecnico(idInforme);
            if (!resultado.success) {
                setError(resultado.error || "Error al anular el informe.");
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
                title="Anular informe"
                className="text-red-500 hover:text-red-700 transition disabled:opacity-50"
            >
                {isPending ? "..." : <i className="fas fa-ban"></i>}
            </button>

            <ModalConfirmacion
                isOpen={showConfirm}
                titulo="Anular informe técnico"
                mensaje="¿Anular este informe técnico?"
                labelConfirmar="Anular informe"
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
