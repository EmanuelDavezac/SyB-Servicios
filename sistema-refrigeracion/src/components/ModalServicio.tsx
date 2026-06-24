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

    const modalContent = (
        <div className="modal-backdrop">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col text-gray-800">
                
                <div className="modal-header">
                    <h3 className="text-xl font-bold">
                        {modoEdicion ? "Editar Servicio" : "Nuevo Servicio"}
                    </h3>
                    <button onClick={() => setAbierto(false)} className="text-white hover:text-white/80 transition">
                        <i className="fas fa-times text-lg"></i>
                    </button>
                </div>

                <div className="px-6 py-5 space-y-6 overflow-y-auto max-h-[75vh]">
                    
                    <section>
                        <h4 className="section-title">DATOS DEL SERVICIO</h4>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Nombre *</label>
                                <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)}
                                    placeholder="Ej: Carga de gas R410A"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Descripción</label>
                                <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
                                    rows={3} placeholder="Ej: Recarga del refrigerante con control de presiones..."
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white resize-none" />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Precio Sugerido *</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-gray-400">$</span>
                                    <input type="number" min="0" step="0.01" value={precio}
                                        onChange={(e) => setPrecio(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 pl-7 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
                                </div>
                            </div>
                        </div>
                    </section>

                </div>

                <div className="modal-footer">
                    <button onClick={() => setAbierto(false)} className="btn-outline">
                        Cancelar
                    </button>
                    <button onClick={handleGuardar} disabled={!nombre.trim() || !precio || cargando}
                        className="btn-primary">
                        {cargando ? "Guardando..." : modoEdicion ? "Guardar Cambios" : "Guardar Servicio"}
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
                <button onClick={handleAbrir} className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition">
                    + Nuevo Servicio
                </button>
            )}
            {abierto && mounted && createPortal(modalContent, document.body)}
        </>
    );
}
