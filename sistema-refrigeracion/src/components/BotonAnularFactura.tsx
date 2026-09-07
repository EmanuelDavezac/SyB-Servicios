"use client";

import { useState } from "react";
import { anularFactura } from "@/actions/cobros";

interface Props {
    idFactura: number;
}

export default function BotonAnularFactura({ idFactura }: Props) {
    const [cargando, setCargando] = useState(false);

    async function handleAnular() {
        if (!confirm("¿Anular este comprobante? Se devolverá al stock los insumos descontados.")) return;

        setCargando(true);
        const resultado = await anularFactura(idFactura);
        setCargando(false);

        if (!resultado.success) {
            alert(resultado.error || "Error al anular el comprobante.");
        }
    }

    return (
        <button
            onClick={handleAnular}
            disabled={cargando}
            title="Anular comprobante"
            className="text-red-500 hover:text-red-700 transition disabled:opacity-50"
        >
            {cargando ? "..." : <i className="fas fa-ban"></i>}
        </button>
    );
}
