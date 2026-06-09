"use client";

import { useState } from "react";
import { crearOrden, editarOrden } from "@/actions/ordenes";

interface Cliente {
    id_cliente: number;
    nombre: string;
    apellido: string;
}

interface OrdenInicial {
    id_orden: number;
    id_cliente: number | null;
    estado_trabajo: string | null;
    notas_internas: string | null;
}

interface Props {
    clientes: Cliente[];
    /** Si se pasa, el modal opera en modo edición */
    ordenInicial?: OrdenInicial;
    /** Botón custom que abre el modal (para el botón editar de la tabla) */
    trigger?: React.ReactNode;
}

export default function ModalOrden({ clientes, ordenInicial, trigger }: Props) {
    const modoEdicion = !!ordenInicial;

    const [abierto, setAbierto] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [idCliente, setIdCliente] = useState(
        ordenInicial ? String(ordenInicial.id_cliente ?? "") : ""
    );
    const [estadoTrabajo, setEstadoTrabajo] = useState(
        ordenInicial?.estado_trabajo ?? "Pendiente"
    );
    const [notasInternas, setNotasInternas] = useState(
        ordenInicial?.notas_internas ?? ""
    );

    function handleAbrir() {
        // Resetea al valor original de la orden al abrir en modo edición
        if (modoEdicion && ordenInicial) {
            setIdCliente(String(ordenInicial.id_cliente ?? ""));
            setEstadoTrabajo(ordenInicial.estado_trabajo ?? "Pendiente");
            setNotasInternas(ordenInicial.notas_internas ?? "");
        }
        setAbierto(true);
    }

    async function handleGuardar() {
        if (!idCliente) return;
        setCargando(true);

        let resultado;
        if (modoEdicion && ordenInicial) {
            resultado = await editarOrden(ordenInicial.id_orden, {
                id_cliente: Number(idCliente),
                estado_trabajo: estadoTrabajo,
                notas_internas: notasInternas || undefined,
            });
        } else {
            resultado = await crearOrden({
                id_cliente: Number(idCliente),
                estado_trabajo: estadoTrabajo,
                notas_internas: notasInternas || undefined,
            });
        }

        setCargando(false);

        if (resultado.success) {
            if (!modoEdicion) {
                setIdCliente("");
                setEstadoTrabajo("Pendiente");
                setNotasInternas("");
            }
            setAbierto(false);
        } else {
            alert(
                modoEdicion
                    ? "Error al guardar los cambios. Intentá de nuevo."
                    : "Error al crear la orden. Intentá de nuevo."
            );
        }
    }

    return (
        <>
            {/* Botón que abre el modal */}
            {trigger ? (
                <span onClick={handleAbrir} style={{ cursor: "pointer" }}>
                    {trigger}
                </span>
            ) : (
                <button
                    onClick={handleAbrir}
                    className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition"
                >
                    + Nueva Orden
                </button>
            )}

            {abierto && (
                <div className="fixed inset-0 bg-slate-900 bg-opacity-60 flex justify-center items-center z-[9999]">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">

                        <div className="flex justify-between items-center border-b pb-3 mb-4">
                            <h3 className="text-xl font-bold text-gray-800">
                                {modoEdicion
                                    ? `Editar Orden #${String(ordenInicial!.id_orden).padStart(5, "0")}`
                                    : "Nueva Orden de Trabajo"}
                            </h3>
                            <button
                                onClick={() => setAbierto(false)}
                                className="text-gray-400 hover:text-red-500 text-2xl leading-none"
                            >
                                &times;
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Cliente *
                                </label>
                                <select
                                    value={idCliente}
                                    onChange={(e) => setIdCliente(e.target.value)}
                                    className="mt-1 w-full border p-2 rounded focus:border-blue-500 outline-none"
                                >
                                    <option value="">Seleccioná un cliente...</option>
                                    {clientes.map((c) => (
                                        <option key={c.id_cliente} value={c.id_cliente}>
                                            {c.apellido}, {c.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Estado
                                </label>
                                <select
                                    value={estadoTrabajo}
                                    onChange={(e) => setEstadoTrabajo(e.target.value)}
                                    className="mt-1 w-full border p-2 rounded focus:border-blue-500 outline-none"
                                >
                                    <option value="Pendiente">Pendiente</option>
                                    <option value="En proceso">En proceso</option>
                                    <option value="Finalizado">Finalizado</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Notas internas
                                </label>
                                <textarea
                                    value={notasInternas}
                                    onChange={(e) => setNotasInternas(e.target.value)}
                                    rows={3}
                                    placeholder="Ej: El cliente pidió pasar los caños por el techo..."
                                    className="mt-1 w-full border p-2 rounded focus:border-blue-500 outline-none resize-none"
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end space-x-3">
                            <button
                                onClick={() => setAbierto(false)}
                                className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleGuardar}
                                disabled={!idCliente || cargando}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {cargando
                                    ? "Guardando..."
                                    : modoEdicion
                                    ? "Guardar Cambios"
                                    : "Guardar Orden"}
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </>
    );
}