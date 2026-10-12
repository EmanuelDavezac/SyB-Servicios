"use client";

import { darDeBajaProveedor, reactivarProveedor } from "@/actions/proveedores";
import BotonBajaEntidad from "@/components/BotonBajaEntidad";

export default function BotonBajaProveedor({
    idProveedor,
    nombreProveedor,
    estadoActual,
}: {
    idProveedor: number;
    nombreProveedor: string;
    estadoActual: boolean;
}) {
    return (
        <BotonBajaEntidad
            id={idProveedor}
            nombre={nombreProveedor}
            estadoActual={estadoActual}
            entidad="proveedor"
            darDeBaja={darDeBajaProveedor}
            reactivar={reactivarProveedor}
        />
    );
}
