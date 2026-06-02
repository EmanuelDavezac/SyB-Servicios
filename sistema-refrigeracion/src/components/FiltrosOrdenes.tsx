"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function FiltrosOrdenes() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Leemos los valores actuales de la URL
    const busqueda = searchParams.get("busqueda") || "";
    const estado = searchParams.get("estado") || "";

    function navegar(nuevos: { busqueda?: string; estado?: string }) {
        const valores = { busqueda, estado, ...nuevos };
        const params = new URLSearchParams();
        if (valores.busqueda?.trim()) params.set("busqueda", valores.busqueda.trim());
        if (valores.estado) params.set("estado", valores.estado);
        
        router.push(`/ordenes?${params.toString()}`);
    }

    return (
        <div className="bg-white p-4 rounded shadow mb-6 flex gap-4 text-black">
            <input
                type="text"
                placeholder="Buscar por Cliente..."
                defaultValue={busqueda}
                onChange={(e) => navegar({ busqueda: e.target.value })}
                className="border p-2 rounded w-1/3 outline-none focus:border-blue-500"
            />

            <select
                value={estado}
                onChange={(e) => navegar({ estado: e.target.value })}
                className="border p-2 rounded w-1/4 outline-none focus:border-blue-500"
            >
                <option value="">Todos los Estados</option>
                <option value="Pendiente">Pendiente</option>
                <option value="En proceso">En proceso</option>
                <option value="Finalizado">Finalizado</option>
            </select>
        </div>
    );
}
