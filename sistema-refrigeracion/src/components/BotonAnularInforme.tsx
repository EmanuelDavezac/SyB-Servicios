"use client";

import { useState } from "react";
import { anularInformeTecnico } from "@/actions/informesTecnicos";

interface Props {
    idInforme: number;
}

export default function BotonAnularInforme({ idInforme }: Props) {
    const [cargando, setCargando] = useState(false);

    async function handleAnular() {
        if (!confirm("¿Anular este informe técnico?")) return;

        setCargando(true);
        const resultado = await anularInformeTecnico(idInforme);
        setCargando(false);

        if (!resultado.success) {
            alert(resultado.error || "Error al anular el informe.");
        }
    }

    return (
        <button
            onClick={handleAnular}
            disabled={cargando}
            title="Anular informe"
            className="text-red-500 hover:text-red-700 transition disabled:opacity-50"
        >
            {cargando ? "..." : <i className="fas fa-ban"></i>}
        </button>
    );
}
