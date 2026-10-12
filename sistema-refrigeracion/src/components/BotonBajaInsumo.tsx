"use client";

import { darDeBajaInsumo, reactivarInsumo } from "@/actions/insumos";
import BotonBajaEntidad from "@/components/BotonBajaEntidad";

export default function BotonBajaInsumo({
    idInsumo,
    nombreInsumo,
    estadoActual,
}: {
    idInsumo: number;
    nombreInsumo: string;
    estadoActual: boolean;
}) {
    return (
        <BotonBajaEntidad
            id={idInsumo}
            nombre={nombreInsumo}
            estadoActual={estadoActual}
            entidad="insumo"
            darDeBaja={darDeBajaInsumo}
            reactivar={reactivarInsumo}
        />
    );
}
