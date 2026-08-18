"use client";

import { useState } from "react";
import { anularCobro } from "@/actions/cobros";

interface Props {
    idRecibo: number;
}

export default function BotonAnularCobro({ idRecibo }: Props) {
    const [cargando, setCargando] = useState(false);

    async function handleAnular() {
        if (!confirm("¿Anular este recibo? Se recalculará el saldo de las facturas imputadas.")) return;

        setCargando(true);
        const resultado = await anularCobro(idRecibo);
        setCargando(false);

        if (!resultado.success) {
            alert(resultado.error || "Error al anular el cobro.");
        }
    }

    return (
        <button
            onClick={handleAnular}
            disabled={cargando}
            title="Anular recibo"
            className="text-red-500 hover:text-red-700 transition disabled:opacity-50 text-sm font-medium"
        >
            {cargando ? "..." : "Anular"}
        </button>
    );
}
