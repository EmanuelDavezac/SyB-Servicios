"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

export default function FiltrosServicios() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const inicialNombre = searchParams.get("nombre") || "";
    const inicialPrecioDesde = searchParams.get("precioDesde") || "";
    const inicialPrecioHasta = searchParams.get("precioHasta") || "";
    const inicialEstado = searchParams.get("estado") || "";

    const [nombre, setNombre] = useState(inicialNombre);
    const [precioDesde, setPrecioDesde] = useState(inicialPrecioDesde);
    const [precioHasta, setPrecioHasta] = useState(inicialPrecioHasta);
    const [estado, setEstado] = useState(inicialEstado);

    const desdeNum = precioDesde.trim() ? parseFloat(precioDesde) : null;
    const hastaNum = precioHasta.trim() ? parseFloat(precioHasta) : null;
    const rangoInvalido = desdeNum !== null && hastaNum !== null && !isNaN(desdeNum) && !isNaN(hastaNum) && desdeNum > hastaNum;

    useEffect(() => {
        const timer = setTimeout(() => {
            const params = new URLSearchParams();
            if (nombre.trim()) params.set("nombre", nombre.trim());
            // Rango invertido: no se aplica (se mantienen los demas filtros).
            if (!rangoInvalido) {
                if (precioDesde.trim()) params.set("precioDesde", precioDesde.trim());
                if (precioHasta.trim()) params.set("precioHasta", precioHasta.trim());
            }
            if (estado) params.set("estado", estado);

            const newQueryString = params.toString();

            if (newQueryString !== searchParams.toString()) {
                router.push(`/servicios?${newQueryString}`);
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [nombre, precioDesde, precioHasta, estado, rangoInvalido, router, searchParams]);

    const hayFiltros = nombre || precioDesde || precioHasta || estado;
    const precioInputCls = `border p-2 rounded w-full md:w-32 outline-none focus:border-sky-500 ${rangoInvalido ? "border-red-400 ring-1 ring-red-400" : ""}`;

    return (
        <div className="bg-white p-4 rounded shadow mb-6 flex flex-col gap-2 text-black">
            <div className="flex flex-col md:flex-row gap-4 md:items-center">
                <input
                    type="text"
                    placeholder="Buscar por Nombre..."
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="border p-2 rounded w-full md:w-1/3 outline-none focus:border-sky-500"
                />
                <input
                    type="number"
                    placeholder="Precio desde"
                    value={precioDesde}
                    onChange={(e) => setPrecioDesde(e.target.value)}
                    className={precioInputCls}
                />
                <input
                    type="number"
                    placeholder="Precio hasta"
                    value={precioHasta}
                    onChange={(e) => setPrecioHasta(e.target.value)}
                    className={precioInputCls}
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
                            setNombre("");
                            setPrecioDesde("");
                            setPrecioHasta("");
                            setEstado("");
                        }}
                        className="w-full md:w-auto bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded hover:bg-red-100 transition text-sm flex items-center justify-center gap-2"
                        title="Limpiar todos los filtros"
                    >
                        <i className="fas fa-eraser"></i>
                    </button>
                )}
            </div>

            {rangoInvalido && (
                <p className="text-red-500 text-xs">
                    &quot;Precio desde&quot; no puede ser mayor que &quot;Precio hasta&quot;: el rango no se aplica.
                </p>
            )}
        </div>
    );
}
