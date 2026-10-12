"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

export default function FiltrosProveedores() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const inicialRazonSocial = searchParams.get("razonSocial") || "";
    const inicialCuit = searchParams.get("cuit") || "";
    const inicialEstado = searchParams.get("estado") || "";

    const [razonSocial, setRazonSocial] = useState(inicialRazonSocial);
    const [cuit, setCuit] = useState(inicialCuit);
    const [estado, setEstado] = useState(inicialEstado);

    useEffect(() => {
        const timer = setTimeout(() => {
            const params = new URLSearchParams();
            if (razonSocial.trim()) params.set("razonSocial", razonSocial.trim());
            if (cuit.trim()) params.set("cuit", cuit.trim());
            if (estado) params.set("estado", estado);

            const newQueryString = params.toString();

            if (newQueryString !== searchParams.toString()) {
                router.push(`/proveedores?${newQueryString}`);
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [razonSocial, cuit, estado, router, searchParams]);

    const hayFiltros = razonSocial || cuit || estado;

    return (
        <div className="bg-white p-4 rounded shadow mb-6 flex flex-col md:flex-row gap-4 text-black md:items-center">
            <input
                type="text"
                placeholder="Buscar por Razón Social o Contacto..."
                value={razonSocial}
                onChange={(e) => setRazonSocial(e.target.value)}
                className="border p-2 rounded w-full md:w-1/3 outline-none focus:border-sky-500"
            />
            <input
                type="text"
                placeholder="CUIT..."
                value={cuit}
                onChange={(e) => setCuit(e.target.value)}
                className="border p-2 rounded w-full md:w-1/4 outline-none focus:border-sky-500"
            />
            <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="border p-2 rounded w-full md:w-auto outline-none focus:border-sky-500"
            >
                <option value="">Todos los Estados</option>
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
            </select>

            {hayFiltros && (
                <button
                    onClick={() => {
                        setRazonSocial("");
                        setCuit("");
                        setEstado("");
                    }}
                    className="w-full md:w-auto bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded hover:bg-red-100 transition text-sm flex items-center justify-center gap-2"
                    title="Limpiar todos los filtros"
                >
                    <i className="fas fa-eraser"></i>
                </button>
            )}
        </div>
    );
}
