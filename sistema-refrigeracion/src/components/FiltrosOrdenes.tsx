"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function FiltrosOrdenes() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Leemos los valores actuales de la URL
    const busqueda = searchParams.get("busqueda") || "";
    const estado = searchParams.get("estado") || "";
    const fechaInicio = searchParams.get("fechaInicio") || "";
    const fechaFin = searchParams.get("fechaFin") || "";

    function navegar(nuevos: { busqueda?: string; estado?: string; fechaInicio?: string; fechaFin?: string }) {
        const valores = { busqueda, estado, fechaInicio, fechaFin, ...nuevos };
        const params = new URLSearchParams();
        if (valores.busqueda?.trim()) params.set("busqueda", valores.busqueda.trim());
        if (valores.estado) params.set("estado", valores.estado);
        if (valores.fechaInicio) params.set("fechaInicio", valores.fechaInicio);
        if (valores.fechaFin) params.set("fechaFin", valores.fechaFin);

        router.push(`/ordenes?${params.toString()}`);
    }

    return (
        <div className="bg-white p-4 rounded shadow mb-6 flex flex-col md:flex-row gap-4 text-black">
            <input
                type="text"
                placeholder="Buscar por Cliente..."
                defaultValue={busqueda}
                onChange={(e) => navegar({ busqueda: e.target.value })}
                className="border p-2 rounded w-full md:w-1/3 outline-none focus:border-blue-500"
            />

            <select
                value={estado}
                onChange={(e) => navegar({ estado: e.target.value })}
                className="border p-2 rounded w-full md:w-1/4 outline-none focus:border-blue-500"
            >
                <option value="">Todos los Estados</option>
                <option value="Pendiente">Pendiente</option>
                <option value="En proceso">En proceso</option>
                <option value="Finalizado">Finalizado</option>
            </select>

            <input
                type="date"
                title="Creada desde"
                defaultValue={fechaInicio}
                onChange={(e) => navegar({ fechaInicio: e.target.value })}
                className="border p-2 rounded w-full md:w-1/5 outline-none focus:border-blue-500 text-sm text-gray-600"
            />

            <input
                type="date"
                title="Creada hasta"
                defaultValue={fechaFin}
                onChange={(e) => navegar({ fechaFin: e.target.value })}
                className="border p-2 rounded w-full md:w-1/5 outline-none focus:border-blue-500 text-sm text-gray-600"
            />
        </div>
    );
}
