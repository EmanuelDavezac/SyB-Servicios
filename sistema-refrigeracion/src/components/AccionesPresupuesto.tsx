"use client";

import { useState } from "react";
import { cambiarEstadoPresupuesto, eliminarPresupuesto } from "@/actions/presupuestos";
import ModalPresupuesto from "@/components/ModalPresupuesto";
import BotonImprimirPresupuesto from "@/components/BotonImprimirPresupuesto";

interface PresupuestoParaEditar {
    id_presupuesto: number;
    id_cliente: number | null;
    destinatario_nombre: string;
    destinatario_cuit: string | null;
    destinatario_domicilio: string | null;
    destinatario_localidad: string | null;
    destinatario_condicion_iva: string | null;
    fecha_emision: string;
    validez_dias: number;
    condicion_pago: string | null;
    alicuota_iva: number;
    observaciones: string | null;
    estado: string;
    detalle_presupuesto: { cantidad: number; descripcion: string; precio_unitario: number }[];
}

interface Props {
    presupuesto: PresupuestoParaEditar;
}

export default function AccionesPresupuesto({ presupuesto }: Props) {
    const [editando, setEditando] = useState(false);
    const [procesando, setProcesando] = useState(false);

    const esPendiente = presupuesto.estado === "PENDIENTE";

    async function handleCambiarEstado(estado: "ACEPTADO" | "RECHAZADO") {
        const verbo = estado === "ACEPTADO" ? "aceptar" : "rechazar";
        if (!confirm(`¿Confirmás ${verbo} este presupuesto?`)) return;
        setProcesando(true);
        const resultado = await cambiarEstadoPresupuesto(presupuesto.id_presupuesto, estado);
        setProcesando(false);
        if (!resultado.success) alert(resultado.error || `No se pudo ${verbo} el presupuesto.`);
    }

    async function handleEliminar() {
        if (!confirm("¿Eliminar este presupuesto? Esta acción no se puede deshacer.")) return;
        setProcesando(true);
        const resultado = await eliminarPresupuesto(presupuesto.id_presupuesto);
        setProcesando(false);
        if (!resultado.success) alert(resultado.error || "No se pudo eliminar el presupuesto.");
    }

    return (
        <div className="flex justify-end gap-3 text-lg opacity-70">
            <BotonImprimirPresupuesto idPresupuesto={presupuesto.id_presupuesto} />

            {esPendiente && (
                <button
                    title="Editar"
                    onClick={() => setEditando(true)}
                    className="hover:text-amber-600"
                    disabled={procesando}
                >
                    <i className="fas fa-pen"></i>
                </button>
            )}

            {esPendiente && (
                <>
                    <button
                        title="Aceptar"
                        onClick={() => handleCambiarEstado("ACEPTADO")}
                        className="hover:text-green-600"
                        disabled={procesando}
                    >
                        <i className="fas fa-check"></i>
                    </button>
                    <button
                        title="Rechazar"
                        onClick={() => handleCambiarEstado("RECHAZADO")}
                        className="hover:text-red-600"
                        disabled={procesando}
                    >
                        <i className="fas fa-xmark"></i>
                    </button>
                    <button
                        title="Eliminar"
                        onClick={handleEliminar}
                        className="hover:text-red-700"
                        disabled={procesando}
                    >
                        <i className="fas fa-trash"></i>
                    </button>
                </>
            )}

            {editando && (
                <ModalPresupuesto
                    presupuestoAEditar={presupuesto}
                    onCerrar={() => setEditando(false)}
                />
            )}
        </div>
    );
}
