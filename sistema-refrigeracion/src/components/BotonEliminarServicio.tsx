"use client";

import { useState } from "react";
import { eliminarServicio } from "@/actions/servicios";

export default function BotonEliminarServicio({
    idServicio,
    nombreServicio,
}: {
    idServicio: number;
    nombreServicio: string;
}) {
    const [loading, setLoading] = useState(false);

    async function handleEliminar() {
        if (!confirm(`¿Estás seguro de que querés eliminar el servicio "${nombreServicio}"?`)) {
            return;
        }

        setLoading(true);
        const res = await eliminarServicio(idServicio);
        setLoading(false);

        if (!res.success) {
            alert(res.error || "Ocurrió un error al eliminar el servicio.");
        }
    }

    return (
        <button
            onClick={handleEliminar}
            disabled={loading}
            className="text-red-600 hover:text-red-800 ml-3 disabled:opacity-50"
            title="Eliminar servicio"
        >
            <i className="fas fa-trash-alt" />
        </button>
    );
}
