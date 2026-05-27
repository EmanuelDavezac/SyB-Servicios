"use client";

import { useState } from "react";
import { crearCliente } from "@/actions/clientes";

export default function ModalCliente() {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const nombre = formData.get("nombre") as string;
        const apellido = formData.get("apellido") as string;
        const cuit = formData.get("cuit") as string;
        const telefono = formData.get("telefono") as string;

        // Enviamos los datos reales del formulario a Neon a través de Prisma
        const res = await crearCliente({ nombre, apellido, cuit, telefono });

        setLoading(false);
        if (res.success) {
            setIsOpen(false); // Cerramos el modal si se guardó con éxito
        } else {
            alert("Hubo un error al intentar guardar el cliente.");
        }
    }

    return (
        <>
            {/* Tu botón del prototipo */}
            <button
                onClick={() => setIsOpen(true)}
                className="bg-sky-600 text-white px-4 py-2 rounded shadow hover:bg-sky-700 transition"
            >
                + Nuevo Cliente
            </button>

            {/* Si isOpen es true, mostramos el modal en pantalla */}
            {isOpen && (
                <div className="fixed inset-0 bg-slate-900 bg-opacity-60 flex justify-center items-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
                        <div className="flex justify-between items-center border-b pb-3 mb-4">
                            <h3 className="text-xl font-bold text-gray-800">Alta de Cliente</h3>
                            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-red-500 text-2xl">&times;</button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4 text-black">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Nombre *</label>
                                    <input name="nombre" type="text" required className="mt-1 w-full border p-2 rounded focus:border-sky-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Apellido *</label>
                                    <input name="apellido" type="text" required className="mt-1 w-full border p-2 rounded focus:border-sky-500 outline-none" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">DNI / CUIT</label>
                                    <input name="cuit" type="text" className="mt-1 w-full border p-2 rounded focus:border-sky-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                                    <input name="telefono" type="text" className="mt-1 w-full border p-2 rounded focus:border-sky-500 outline-none" />
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end space-x-3">
                                <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={loading} className="px-4 py-2 bg-sky-600 text-white rounded hover:bg-sky-700 disabled:bg-gray-400 font-semibold">
                                    {loading ? "Guardando..." : "Guardar Cliente"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}