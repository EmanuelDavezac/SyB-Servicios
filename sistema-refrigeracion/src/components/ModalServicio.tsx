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
        <div className="fixed inset-0 bg-slate-900 bg-opacity-60 flex justify-center items-center z-[9999]">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
                <div className="flex justify-between items-center border-b pb-3 mb-4">
                    <h3 className="text-xl font-bold text-gray-800">
                        {modoEdicion ? "Editar Servicio" : "Nuevo Servicio"}
                    </h3>
                    <button onClick={() => setAbierto(false)} className="text-gray-400 hover:text-red-500 text-2xl leading-none">&times;</button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nombre *</label>
                        <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)}
                            placeholder="Ej: Carga de gas R410A"
                            className="mt-1 w-full border p-2 rounded focus:border-blue-500 outline-none text-black" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Descripción</label>
                        <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
                            rows={3} placeholder="Ej: Recarga del refrigerante con control de presiones..."
                            className="mt-1 w-full border p-2 rounded focus:border-blue-500 outline-none resize-none text-black" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Precio *</label>
                        <div className="mt-1 flex items-center">
                            <span className="px-3 py-2 bg-gray-100 border border-r-0 rounded-l text-gray-500 text-sm">$</span>
                            <input type="number" min="0" step="0.01" value={precio}
                                onChange={(e) => setPrecio(e.target.value)}
                                placeholder="0.00"
                                className="w-full border p-2 rounded-r focus:border-blue-500 outline-none text-black" />
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={() => setAbierto(false)} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50">
                        Cancelar
                    </button>
                    <button onClick={handleGuardar} disabled={!nombre.trim() || !precio || cargando}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
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
