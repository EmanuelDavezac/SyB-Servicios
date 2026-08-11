"use client";
import { useState } from "react";

export default function ModalNuevoServicio() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* El botón que abre el modal */}
            <button
                onClick={() => setIsOpen(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition flex items-center gap-2"
            >
                <i className="fas fa-plus" /> Nuevo Servicio
            </button>

            {/* Si isOpen es true, mostramos el fondo oscuro y la ventana */}
            {isOpen && (
                <div className="fixed inset-0 bg-[#0f172a]/80 z-50 flex items-center justify-center p-4">

                    {/* Contenedor principal de la ventana */}
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden">

                        {/* Encabezado del modal */}
                        <div className="flex justify-between items-center p-6 pb-4">
                            <h3 className="text-2xl font-bold text-[#1e293b]">Alta de Servicio</h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-gray-400 hover:text-gray-600 text-2xl"
                            >
                                &times;
                            </button>
                        </div>

                        {/* Cuerpo del formulario (adaptado a Servicios según tu imagen) */}
                        <div className="p-6 pt-0 space-y-5">
                            {/* Fila 1 */}
                            <div>
                                <label className="block text-sm text-[#1e293b] mb-1">Nombre del Servicio *</label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded p-2 outline-none focus:border-blue-500"
                                />
                            </div>

                            {/* Fila 2 (Dos columnas) */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-[#1e293b] mb-1">Descripción</label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-300 rounded p-2 outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-[#1e293b] mb-1">Categoría</label>
                                    <select className="w-full border border-gray-300 rounded p-2 outline-none focus:border-blue-500">
                                        <option>Seleccionar...</option>
                                    </select>
                                </div>
                            </div>

                            {/* Fila 3 (Dos columnas) */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-[#1e293b] mb-1">Precio *</label>
                                    <input
                                        type="number"
                                        className="w-full border border-gray-300 rounded p-2 outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    {/* Etiqueta roja como en la imagen */}
                                    <label className="block text-sm text-red-600 mb-1">Estado *</label>
                                    <select className="w-full border border-red-300 rounded p-2 outline-none focus:border-red-500">
                                        <option>Activo</option>
                                        <option>Inactivo</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Pie del modal (Botones) */}
                        <div className="flex justify-end gap-4 p-6 pt-2">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="px-5 py-2 border border-gray-300 rounded text-[#1e293b] hover:bg-gray-50 transition font-medium"
                            >
                                Cancelar
                            </button>
                            <button className="px-5 py-2 bg-[#0088cc] text-white rounded hover:bg-[#0077b3] transition font-medium">
                                Guardar Servicio
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}