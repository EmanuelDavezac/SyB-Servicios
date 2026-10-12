"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { cambiarEstadoPresupuesto, eliminarPresupuesto, crearOrdenDesdePresupuesto } from "@/actions/presupuestos";
import ModalPresupuesto from "@/components/ModalPresupuesto";
import BotonImprimirPresupuesto from "@/components/BotonImprimirPresupuesto";
import ModalClienteDesdePresupuesto from "@/components/ModalClienteDesdePresupuesto";
import ModalConfirmacion from "@/components/ModalConfirmacion";

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
    alicuota_iva: number | string;
    observaciones: string | null;
    estado: string;
    detalle_presupuesto: { cantidad: number | string; descripcion: string; precio_unitario: number | string }[];
}

interface Props {
    presupuesto: PresupuestoParaEditar;
}

// Confirmaciones que puede abrir esta fila; una sola a la vez.
type Confirmacion = "generarOrden" | "aceptar" | "rechazar" | "eliminar" | "altaCliente";

const TEXTOS_CONFIRMACION: Record<Confirmacion, {
    titulo: string;
    mensaje: string;
    labelConfirmar: string;
    labelCancelar?: string;
    labelProcesando: string;
    iconoConfirmar: string;
    tono: "peligro" | "neutro";
}> = {
    generarOrden: {
        titulo: "Generar orden de trabajo",
        mensaje: "¿Generar una orden de trabajo a partir de este presupuesto?",
        labelConfirmar: "Generar orden",
        labelProcesando: "Generando...",
        iconoConfirmar: "fa-clipboard-list",
        tono: "neutro",
    },
    aceptar: {
        titulo: "Aceptar presupuesto",
        mensaje: "¿Confirmás aceptar este presupuesto?",
        labelConfirmar: "Aceptar",
        labelProcesando: "Aceptando...",
        iconoConfirmar: "fa-check",
        tono: "neutro",
    },
    rechazar: {
        titulo: "Rechazar presupuesto",
        mensaje: "¿Confirmás rechazar este presupuesto?",
        labelConfirmar: "Rechazar",
        labelProcesando: "Rechazando...",
        iconoConfirmar: "fa-xmark",
        tono: "peligro",
    },
    eliminar: {
        titulo: "Eliminar presupuesto",
        mensaje: "¿Eliminar este presupuesto? Esta acción no se puede deshacer.",
        labelConfirmar: "Eliminar",
        labelProcesando: "Eliminando...",
        iconoConfirmar: "fa-trash",
        tono: "peligro",
    },
    altaCliente: {
        titulo: "Presupuesto aceptado",
        mensaje: "¿Querés agregar el destinatario a tu base de clientes?",
        labelConfirmar: "Agregar cliente",
        labelCancelar: "No, gracias",
        labelProcesando: "Abriendo...",
        iconoConfirmar: "fa-user-plus",
        tono: "neutro",
    },
};

export default function AccionesPresupuesto({ presupuesto }: Props) {
    const [editando, setEditando] = useState(false);
    const [procesando, startTransition] = useTransition();
    const [ofreciendoAltaCliente, setOfreciendoAltaCliente] = useState(false);
    const [confirmacion, setConfirmacion] = useState<Confirmacion | null>(null);
    const [error, setError] = useState<string | null>(null);

    const esPendiente = presupuesto.estado === "PENDIENTE";
    const esAceptado = presupuesto.estado === "ACEPTADO";
    const puedeGenerarOrden = esAceptado && !!presupuesto.id_cliente && !presupuesto.id_orden;

    function abrirConfirmacion(tipo: Confirmacion) {
        setError(null);
        setConfirmacion(tipo);
    }

    function cerrarConfirmacion() {
        setError(null);
        setConfirmacion(null);
    }

    function handleConfirmar() {
        const tipo = confirmacion;
        if (!tipo) return;

        if (tipo === "altaCliente") {
            setConfirmacion(null);
            setOfreciendoAltaCliente(true);
            return;
        }

        startTransition(async () => {
            if (tipo === "generarOrden") {
                const resultado = await crearOrdenDesdePresupuesto(presupuesto.id_presupuesto);
                if (!resultado.success) {
                    setError(resultado.error || "No se pudo generar la orden de trabajo.");
                    return;
                }
                setConfirmacion(null);
                return;
            }

            if (tipo === "aceptar" || tipo === "rechazar") {
                const estado = tipo === "aceptar" ? "ACEPTADO" : "RECHAZADO";
                const resultado = await cambiarEstadoPresupuesto(presupuesto.id_presupuesto, estado);
                if (!resultado.success) {
                    setError(resultado.error || `No se pudo ${tipo} el presupuesto.`);
                    return;
                }
                // Si el destinatario no es cliente, se ofrece darlo de alta.
                setError(null);
                setConfirmacion(estado === "ACEPTADO" && !presupuesto.id_cliente ? "altaCliente" : null);
                return;
            }

            const resultado = await eliminarPresupuesto(presupuesto.id_presupuesto);
            if (!resultado.success) {
                setError(resultado.error || "No se pudo eliminar el presupuesto.");
                return;
            }
            setConfirmacion(null);
        });
    }

    const textos = confirmacion ? TEXTOS_CONFIRMACION[confirmacion] : null;

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
                        onClick={() => abrirConfirmacion("aceptar")}
                        className="hover:text-green-600"
                        disabled={procesando}
                    >
                        <i className="fas fa-check"></i>
                    </button>
                    <button
                        title="Rechazar"
                        onClick={() => abrirConfirmacion("rechazar")}
                        className="hover:text-red-600"
                        disabled={procesando}
                    >
                        <i className="fas fa-xmark"></i>
                    </button>
                    <button
                        title="Eliminar"
                        onClick={() => abrirConfirmacion("eliminar")}
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
                    onClick={() => abrirConfirmacion("generarOrden")}
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

            {textos && (
                <ModalConfirmacion
                    isOpen
                    titulo={textos.titulo}
                    mensaje={textos.mensaje}
                    labelConfirmar={textos.labelConfirmar}
                    labelCancelar={textos.labelCancelar}
                    labelProcesando={textos.labelProcesando}
                    iconoConfirmar={textos.iconoConfirmar}
                    tono={textos.tono}
                    procesando={procesando}
                    error={error}
                    onConfirmar={handleConfirmar}
                    onCancelar={cerrarConfirmacion}
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
