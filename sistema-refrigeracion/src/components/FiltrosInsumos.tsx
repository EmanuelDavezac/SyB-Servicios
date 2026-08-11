"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Proveedor = {
    id_proveedor: number;
    razon_social: string;
    nombre_proveedor: string | null;
};

export default function FiltrosInsumos({ proveedores }: { proveedores: Proveedor[] }) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Leemos los valores actuales de la URL
    const busqueda = searchParams.get("busqueda") || "";
    const estado = searchParams.get("estado") || "";
    const proveedor = searchParams.get("proveedor") || "";

    function navegar(nuevos: { busqueda?: string; estado?: string; proveedor?: string }) {
        const valores = { busqueda, estado, proveedor, ...nuevos };
        const params = new URLSearchParams();
        if (valores.busqueda?.trim()) params.set("busqueda", valores.busqueda.trim());
        if (valores.estado) params.set("estado", valores.estado);
        if (valores.proveedor) params.set("proveedor", valores.proveedor);
        router.push(`/insumos?${params.toString()}`);
    }

    return (
        <div className="bg-white p-4 rounded shadow mb-6 flex gap-4 text-black">
            <input
                type="text"
                placeholder="Buscar por Nombre..."
                defaultValue={busqueda}
                onChange={(e) => navegar({ busqueda: e.target.value })}
                className="border p-2 rounded w-1/3 outline-none focus:border-sky-500"
            />
            <select
                value={proveedor}
                onChange={(e) => navegar({ proveedor: e.target.value })}
                className="border p-2 rounded w-1/4 outline-none focus:border-sky-500"
            >
                <option value="">Todos los Proveedores</option>
                {proveedores.map((prov) => (
                    <option key={prov.id_proveedor} value={prov.id_proveedor}>
                        {prov.razon_social || prov.nombre_proveedor}
                    </option>
                ))}
            </select>
            <select
                value={estado}
                onChange={(e) => navegar({ estado: e.target.value })}
                className="border p-2 rounded w-1/4 outline-none focus:border-sky-500"
            >
                <option value="">Todos los Estados</option>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
            </select>
        </div>
    );
}
