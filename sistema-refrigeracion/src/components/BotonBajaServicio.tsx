"use client";

import { darDeBajaServicio, reactivarServicio } from "@/actions/servicios";
import BotonBajaEntidad from "@/components/BotonBajaEntidad";

export default function BotonBajaServicio({
    idServicio,
    nombreServicio,
    estadoActual,
}: {
    idServicio: number;
    nombreServicio: string;
    estadoActual: boolean;
}) {
    return (
        <BotonBajaEntidad
            id={idServicio}
            nombre={nombreServicio}
            estadoActual={estadoActual}
            entidad="servicio"
            darDeBaja={darDeBajaServicio}
            reactivar={reactivarServicio}
        />
    );
}
