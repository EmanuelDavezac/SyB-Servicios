"use client";

import { useState } from "react";
import Link from "next/link";
import { cambiarEstadoPresupuesto, eliminarPresupuesto, crearOrdenDesdePresupuesto } from "@/actions/presupuestos";
import ModalPresupuesto from "@/components/ModalPresupuesto";
import BotonImprimirPresupuesto from "@/components/BotonImprimirPresupuesto";
import ModalClienteDesdePresupuesto from "@/components/ModalClienteDesdePresupuesto";

interface PresupuestoParaEditar {
    id_presupuesto: number;
    id_cliente: number | null;
    id_orden: number | null;
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
    const [ofreciendoAltaCliente, setOfreciendoAltaCliente] = useState(false);

    const esPendiente = presupuesto.estado === "PENDIENTE";
    const esAceptado = presupuesto.estado === "ACEPTADO";
    const puedeGenerarOrden = esAceptado && !!presupuesto.id_cliente && !presupuesto.id_orden;

    async function handleGenerarOrden() {
        if (!confirm("¿Generar una orden de trabajo a partir de este presupuesto?")) return;
        setProcesando(true);
        const resultado = await crearOrdenDesdePresupuesto(presupuesto.id_presupuesto);
        setProcesando(false);
        if (!resultado.success) {
            alert(resultado.error || "No se pudo generar la orden de trabajo.");
        }
    }

    async function handleCambiarEstado(estado: "ACEPTADO" | "RECHAZADO") {
        const verbo = estado === "ACEPTADO" ? "aceptar" : "rechazar";
        if (!confirm(`¿Confirmás ${verbo} este presupuesto?`)) return;
        setProcesando(true);
        const resultado = await cambiarEstadoPresupuesto(presupuesto.id_presupuesto, estado);
        setProcesando(false);
        if (!resultado.success) {
            alert(resultado.error || `No se pudo ${verbo} el presupuesto.`);
            return;
        }
        if (estado === "ACEPTADO" && !presupuesto.id_cliente) {
            if (confirm("Presupuesto aceptado. ¿Querés agregar el destinatario a tu base de clientes?")) {
                setOfreciendoAltaCliente(true);
            }
        }
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

            {puedeGenerarOrden && (
                <button
                    title="Generar orden de trabajo a partir de este presupuesto"
                    onClick={handleGenerarOrden}
                    className="hover:text-blue-600"
                    disabled={procesando}
                >
                    <i className="fas fa-clipboard-list"></i>
                </button>
            )}

            {esAceptado && presupuesto.id_orden && (
                <Link
                    href="/ordenes"
                    title={`Orden de trabajo #${presupuesto.id_orden} generada`}
                    className="text-green-600 hover:text-green-800"
                >
                    <i className="fas fa-circle-check"></i>
                </Link>
            )}

            {editando && (
                <ModalPresupuesto
                    presupuestoAEditar={presupuesto}
                    onCerrar={() => setEditando(false)}
                />
            )}

            {ofreciendoAltaCliente && (
                <ModalClienteDesdePresupuesto
                    idPresupuesto={presupuesto.id_presupuesto}
                    destinatarioNombre={presupuesto.destinatario_nombre}
                    destinatarioCuit={presupuesto.destinatario_cuit}
                    destinatarioDomicilio={presupuesto.destinatario_domicilio}
                    destinatarioLocalidad={presupuesto.destinatario_localidad}
                    onCerrar={() => setOfreciendoAltaCliente(false)}
                />
            )}
        </div>
    );
}
