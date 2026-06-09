"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function FiltrosFacturacion() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Leemos los valores actuales de la URL
    const inicialComprobante = searchParams.get("comprobante") || "";
    const inicialCliente = searchParams.get("cliente") || "";
    const inicialEstado = searchParams.get("estado") || "";

    const [comprobante, setComprobante] = useState(inicialComprobante);
    const [cliente, setCliente] = useState(inicialCliente);
    const [estado, setEstado] = useState(inicialEstado);

    function aplicarFiltros() {
        const params = new URLSearchParams();
        if (comprobante.trim()) params.set("comprobante", comprobante.trim());
        if (cliente.trim()) params.set("cliente", cliente.trim());
        if (estado) params.set("estado", estado);
        
        router.push(`/facturacion?${params.toString()}`);
    }

    return (
        <div className="bg-white p-4 rounded shadow mb-6 flex gap-4 text-black items-center">
            <input
                type="text"
                placeholder="N° Comprobante..."
                value={comprobante}
                onChange={(e) => setComprobante(e.target.value)}
                className="border p-2 rounded w-1/4 outline-none focus:border-blue-500"
            />
            
            <input
                type="text"
                placeholder="Cliente..."
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                className="border p-2 rounded w-1/4 outline-none focus:border-blue-500"
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

            <button 
                onClick={aplicarFiltros}
                className="bg-slate-800 text-white px-6 py-2 rounded hover:bg-slate-700 transition"
            >
                Filtrar
            </button>
        </div>
    );
}
