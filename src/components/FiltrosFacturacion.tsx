"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

export default function FiltrosFacturacion() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Leemos los valores actuales de la URL
    const inicialFechaInicio = searchParams.get("fechaInicio") || "";
    const inicialFechaFin = searchParams.get("fechaFin") || "";
    const inicialCliente = searchParams.get("cliente") || "";
    const inicialEstado = searchParams.get("estado") || "";

    const [fechaInicio, setFechaInicio] = useState(inicialFechaInicio);
    const [fechaFin, setFechaFin] = useState(inicialFechaFin);
    const [cliente, setCliente] = useState(inicialCliente);
    const [estado, setEstado] = useState(inicialEstado);

    useEffect(() => {
        const timer = setTimeout(() => {
            const params = new URLSearchParams();
            if (fechaInicio) params.set("fechaInicio", fechaInicio);
            if (fechaFin) params.set("fechaFin", fechaFin);
            if (cliente.trim()) params.set("cliente", cliente.trim());
            if (estado) params.set("estado", estado);
            
            const newQueryString = params.toString();
            
            if (newQueryString !== searchParams.toString()) {
                router.push(`/facturacion?${newQueryString}`);
            }
        }, 400); 

        return () => clearTimeout(timer);
    }, [fechaInicio, fechaFin, cliente, estado, router, searchParams]);

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
            
            <input
                type="text"
                placeholder="Cliente..."
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                className="border p-2 rounded flex-1 outline-none focus:border-blue-500"
            />

            <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="border p-2 rounded w-1/4 outline-none focus:border-blue-500"
            >
                <option value="">Todos los Estados</option>
                <option value="Pendiente">PENDIENTE</option>
                <option value="Pagada">PAGADA</option>
                <option value="Impaga">IMPAGA</option>
                <option value="Entregado">ENTREGADO</option>
                <option value="Anulada">ANULADA</option>
            </select>

            {(fechaInicio || fechaFin || cliente || estado) && (
                <button
                    onClick={() => {
                        setFechaInicio("");
                        setFechaFin("");
                        setCliente("");
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
