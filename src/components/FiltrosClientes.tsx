"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

export default function FiltrosClientes() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const inicialNombre = searchParams.get("nombre") || "";
    const inicialCuit = searchParams.get("cuit") || "";
    const inicialEstado = searchParams.get("estado") || "";

    const [nombre, setNombre] = useState(inicialNombre);
    const [cuit, setCuit] = useState(inicialCuit);
    const [estado, setEstado] = useState(inicialEstado);

    useEffect(() => {
        const timer = setTimeout(() => {
            const params = new URLSearchParams();
            if (nombre.trim()) params.set("nombre", nombre.trim());
            if (cuit.trim()) params.set("cuit", cuit.trim());
            if (estado) params.set("estado", estado);

            const newQueryString = params.toString();

            if (newQueryString !== searchParams.toString()) {
                router.push(`/clientes?${newQueryString}`);
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [nombre, cuit, estado, router, searchParams]);

    return (
        <div className="bg-white p-4 rounded shadow mb-6 flex gap-4 text-black items-center">
            <input
                type="text"
                placeholder="Buscar por Nombre..."
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="border p-2 rounded w-1/3 outline-none focus:border-sky-500"
            />
            <input
                type="text"
                placeholder="DNI / CUIT..."
                value={cuit}
                onChange={(e) => setCuit(e.target.value)}
                className="border p-2 rounded w-1/4 outline-none focus:border-sky-500"
            />
            <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="border p-2 rounded outline-none focus:border-sky-500"
            >
                <option value="">Todos los Estados</option>
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
            </select>

            {(nombre || cuit || estado) && (
                <button
                    onClick={() => {
                        setNombre("");
                        setCuit("");
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
