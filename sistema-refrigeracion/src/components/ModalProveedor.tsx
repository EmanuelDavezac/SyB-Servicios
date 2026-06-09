"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { crearProveedor, editarProveedor } from "@/actions/proveedores";

interface ProveedorInicial {
    id_proveedor: number;
    razon_social: string;
    nombre_proveedor: string | null;
    cuit: string | null;
    telefono: string | null;
    email: string | null;
}

interface Props {
    proveedorInicial?: ProveedorInicial;
    trigger?: React.ReactNode;
}

export default function ModalProveedor({ proveedorInicial, trigger }: Props) {
    const modoEdicion = !!proveedorInicial;

    const [abierto, setAbierto] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [mounted, setMounted] = useState(false);

    const [razonSocial, setRazonSocial] = useState(proveedorInicial?.razon_social ?? "");
    const [nombreProveedor, setNombreProveedor] = useState(proveedorInicial?.nombre_proveedor ?? "");
    const [cuit, setCuit] = useState(proveedorInicial?.cuit ?? "");
    const [telefono, setTelefono] = useState(proveedorInicial?.telefono ?? "");
    const [email, setEmail] = useState(proveedorInicial?.email ?? "");

    useEffect(() => { setMounted(true); }, []);

    function handleAbrir() {
        if (modoEdicion && proveedorInicial) {
            setRazonSocial(proveedorInicial.razon_social);
            setNombreProveedor(proveedorInicial.nombre_proveedor ?? "");
            setCuit(proveedorInicial.cuit ?? "");
            setTelefono(proveedorInicial.telefono ?? "");
            setEmail(proveedorInicial.email ?? "");
        }
        setAbierto(true);
    }

    async function handleGuardar() {
        if (!razonSocial.trim()) return;
        setCargando(true);

        const datos = {
            razon_social: razonSocial.trim(),
            nombre_proveedor: nombreProveedor.trim() || undefined,
            cuit: cuit.trim() || undefined,
            telefono: telefono.trim() || undefined,
            email: email.trim() || undefined,
        };

        const resultado = modoEdicion && proveedorInicial
            ? await editarProveedor(proveedorInicial.id_proveedor, datos)
            : await crearProveedor(datos);

        setCargando(false);

        if (resultado.success) {
            if (!modoEdicion) {
                setRazonSocial(""); setNombreProveedor(""); setCuit(""); setTelefono(""); setEmail("");
            }
            setAbierto(false);
        } else {
            alert(modoEdicion ? "Error al guardar los cambios." : "Error al crear el proveedor.");
        }
    }

    const modalContent = (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-60 flex justify-center items-center z-[9999]">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
                <div className="flex justify-between items-center border-b pb-3 mb-4">
                    <h3 className="text-xl font-bold text-gray-800">
                        {modoEdicion ? "Editar Proveedor" : "Nuevo Proveedor"}
                    </h3>
                    <button onClick={() => setAbierto(false)} className="text-gray-400 hover:text-red-500 text-2xl leading-none">&times;</button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Razón Social *</label>
                        <input type="text" value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)}
                            placeholder="Ej: Distribuidora Frío Sur S.A."
                            className="mt-1 w-full border p-2 rounded focus:border-blue-500 outline-none text-black" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nombre de Contacto</label>
                        <input type="text" value={nombreProveedor} onChange={(e) => setNombreProveedor(e.target.value)}
                            placeholder="Ej: Juan García"
                            className="mt-1 w-full border p-2 rounded focus:border-blue-500 outline-none text-black" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">CUIT</label>
                            <input type="text" value={cuit} onChange={(e) => setCuit(e.target.value)}
                                placeholder="Ej: 30-12345678-9"
                                className="mt-1 w-full border p-2 rounded focus:border-blue-500 outline-none text-black" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                            <input type="text" value={telefono} onChange={(e) => setTelefono(e.target.value)}
                                placeholder="Ej: 351 123-4567"
                                className="mt-1 w-full border p-2 rounded focus:border-blue-500 outline-none text-black" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                            placeholder="Ej: ventas@distribuidora.com"
                            className="mt-1 w-full border p-2 rounded focus:border-blue-500 outline-none text-black" />
                    </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={() => setAbierto(false)} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50">
                        Cancelar
                    </button>
                    <button onClick={handleGuardar} disabled={!razonSocial.trim() || cargando}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                        {cargando ? "Guardando..." : modoEdicion ? "Guardar Cambios" : "Guardar Proveedor"}
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
                    + Nuevo Proveedor
                </button>
            )}
            {abierto && mounted && createPortal(modalContent, document.body)}
        </>
    );
}
