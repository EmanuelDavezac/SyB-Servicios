"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { crearServicio, editarServicio } from "@/actions/servicios";

interface ServicioInicial {
    id_servicio: number;
    nombre: string;
    descripcion: string | null;
    precio: number;
}

interface Props {
    servicioInicial?: ServicioInicial;
    trigger?: React.ReactNode;
}

export default function ModalServicio({ servicioInicial, trigger }: Props) {
    const modoEdicion = !!servicioInicial;

    const [abierto, setAbierto] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [mounted, setMounted] = useState(false);

    const [nombre, setNombre] = useState(servicioInicial?.nombre ?? "");
    const [descripcion, setDescripcion] = useState(servicioInicial?.descripcion ?? "");
    const [precio, setPrecio] = useState(servicioInicial ? String(servicioInicial.precio) : "");

    useEffect(() => { setMounted(true); }, []);

    function handleAbrir() {
        if (modoEdicion && servicioInicial) {
            setNombre(servicioInicial.nombre);
            setDescripcion(servicioInicial.descripcion ?? "");
            setPrecio(String(servicioInicial.precio));
        }
        setAbierto(true);
    }

    async function handleGuardar() {
        if (!nombre.trim() || !precio) return;
        setCargando(true);

        const datos = {
            nombre: nombre.trim(),
            descripcion: descripcion.trim() || undefined,
            precio: Number(precio),
        };

        const resultado = modoEdicion && servicioInicial
            ? await editarServicio(servicioInicial.id_servicio, datos)
            : await crearServicio(datos);

        setCargando(false);

        if (resultado.success) {
            if (!modoEdicion) { setNombre(""); setDescripcion(""); setPrecio(""); }
            setAbierto(false);
        } else {
            alert(modoEdicion ? "Error al guardar los cambios." : "Error al crear el servicio.");
        }
    }

    const inputCls =
        "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400";

    const modalContent = (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-[9999] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col text-gray-800 overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-sky-600 to-sky-700 text-white rounded-t-2xl">
                    <div>
                        <h3 className="text-lg font-bold tracking-wide">
                            {modoEdicion ? "Editar Servicio" : "Nuevo Servicio"}
                        </h3>
                        <p className="text-sky-100 text-xs mt-0.5">
                            {modoEdicion ? "Modificá los datos del servicio." : "Completá los datos del nuevo servicio."}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setAbierto(false)}
                        className="text-white/70 hover:text-white text-2xl leading-none transition"
                    >
                        &times;
                    </button>
                </div>

                {/* Cuerpo */}
                <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[70vh]">

                    {/* ── Datos del servicio ── */}
                    <section>
                        <h4 className="text-xs font-bold uppercase tracking-widest text-sky-600 mb-3 border-b pb-1">
                            Datos del servicio
                        </h4>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Nombre *</label>
                                <input
                                    type="text"
                                    value={nombre}
                                    onChange={(e) => setNombre(e.target.value)}
                                    placeholder="Ej: Carga de gas R410A"
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Descripción</label>
                                <textarea
                                    value={descripcion}
                                    onChange={(e) => setDescripcion(e.target.value)}
                                    rows={3}
                                    placeholder="Ej: Recarga del refrigerante con control de presiones..."
                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
                                />
                            </div>
                        </div>
                    </section>

                    {/* ── Precio ── */}
                    <section>
                        <h4 className="text-xs font-bold uppercase tracking-widest text-sky-600 mb-3 border-b pb-1">
                            Precio
                        </h4>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Precio *</label>
                            <div className="flex items-center">
                                <span className="px-3 py-2 bg-gray-100 border border-r-0 rounded-l-lg text-gray-500 text-sm">$</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={precio}
                                    onChange={(e) => setPrecio(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full border rounded-r-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                                />
                            </div>
                        </div>
                    </section>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
                    <button
                        type="button"
                        onClick={() => setAbierto(false)}
                        className="px-5 py-2 text-sm border rounded-lg text-gray-600 hover:bg-gray-100 font-medium transition"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleGuardar}
                        disabled={!nombre.trim() || !precio || cargando}
                        className="px-5 py-2 text-sm bg-sky-600 text-white rounded-lg hover:bg-sky-700 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {cargando ? (
                            <span className="flex items-center gap-2">
                                <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                                Guardando...
                            </span>
                        ) : (
                            modoEdicion ? "Guardar Cambios" : "Guardar Servicio"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <>
            {trigger ? (
                <span onClick={handleAbrir} style={{ cursor: "pointer" }}>{trigger}</span>
            ) : (
                <button onClick={handleAbrir} className="bg-sky-600 text-white px-4 py-2 rounded shadow hover:bg-sky-700 transition">
                    + Nuevo Servicio
                </button>
            )}
            {abierto && mounted && createPortal(modalContent, document.body)}
        </>
    );
}
