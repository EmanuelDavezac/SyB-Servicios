"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

export default function FiltrosPresupuestos() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const inicialFechaInicio = searchParams.get("fechaInicio") || "";
    const inicialFechaFin = searchParams.get("fechaFin") || "";
    const inicialEstado = searchParams.get("estado") || "";

    const [fechaInicio, setFechaInicio] = useState(inicialFechaInicio);
    const [fechaFin, setFechaFin] = useState(inicialFechaFin);
    const [estado, setEstado] = useState(inicialEstado);

    useEffect(() => {
        const timer = setTimeout(() => {
            const params = new URLSearchParams();
            if (fechaInicio) params.set("fechaInicio", fechaInicio);
            if (fechaFin) params.set("fechaFin", fechaFin);
            if (estado) params.set("estado", estado);

            const newQueryString = params.toString();

            if (newQueryString !== searchParams.toString()) {
                router.push(`/presupuestos?${newQueryString}`);
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [fechaInicio, fechaFin, estado, router, searchParams]);

    return (
        <div className="bg-white p-4 rounded shadow mb-6 flex gap-4 text-black items-center">
            <input
                type="date"
                title="Fecha Inicio"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="border p-2 rounded w-1/5 outline-none focus:border-blue-500 text-sm text-gray-600"
            />

            <input
                type="date"
                title="Fecha Fin"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="border p-2 rounded w-1/5 outline-none focus:border-blue-500 text-sm text-gray-600"
            />

            <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="border p-2 rounded w-1/4 outline-none focus:border-blue-500"
            >
                <option value="">Todos los Estados</option>
                <option value="PENDIENTE">PENDIENTE</option>
                <option value="ACEPTADO">ACEPTADO</option>
                <option value="RECHAZADO">RECHAZADO</option>
            </select>

            {(fechaInicio || fechaFin || estado) && (
                <button
                    onClick={() => {
                        setFechaInicio("");
                        setFechaFin("");
                        setEstado("");
                    }}
                    className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded hover:bg-red-100 transition text-sm flex items-center gap-2"
                    title="Limpiar todos los filtros"
                >
                    <i className="fas fa-eraser"></i>
                </button>
            )}
        </div>
    );
}
