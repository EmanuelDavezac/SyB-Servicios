"use client";

import { darDeBajaCliente, reactivarCliente } from "@/actions/clientes";
import BotonBajaEntidad from "@/components/BotonBajaEntidad";

export default function BotonBajaCliente({
    idCliente,
    nombreCliente,
    estadoActual,
}: {
    idCliente: number;
    nombreCliente: string;
    estadoActual: boolean;
}) {
    return (
        <BotonBajaEntidad
            id={idCliente}
            nombre={nombreCliente}
            estadoActual={estadoActual}
            entidad="cliente"
            darDeBaja={darDeBajaCliente}
            reactivar={reactivarCliente}
        />
    );
}
