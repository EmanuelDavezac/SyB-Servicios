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
            cuit: String(cuit).trim() || undefined,
            telefono: String(telefono).trim() || undefined,
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
        <div className="modal-backdrop">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col text-gray-800">
                <div className="modal-header">
                    <h3 className="text-xl font-bold">
                        {modoEdicion ? "Editar Proveedor" : "Nuevo Proveedor"}
                    </h3>
                    <button onClick={() => setAbierto(false)} className="text-white hover:text-white/80 transition">
                        <i className="fas fa-times text-lg"></i>
                    </button>
                </div>

                <div className="px-6 py-5 space-y-6 overflow-y-auto max-h-[75vh]">
                    
                    <section>
                        <h4 className="section-title">DATOS DE LA EMPRESA</h4>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Razón Social *</label>
                                <input type="text" value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)}
                                    placeholder="Ej: Distribuidora Frío Sur S.A."
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white shadow-sm" />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">CUIT / Identificación</label>
                                <input type="text" value={cuit} onChange={(e) => setCuit(e.target.value.replace(/\D/g, ''))}
                                    placeholder="Ej: 30123456789"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white shadow-sm" />
                            </div>
                        </div>
                    </section>

                    <section>
                        <h4 className="section-title">CONTACTO</h4>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Nombre de Contacto</label>
                                <input type="text" value={nombreProveedor} onChange={(e) => setNombreProveedor(e.target.value)}
                                    placeholder="Ej: Juan García"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white shadow-sm" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Teléfono</label>
                                    <input type="text" value={telefono} onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ''))}
                                        placeholder="Ej: 3511234567"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white shadow-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Ej: ventas@distribuidora.com"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white shadow-sm" />
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="modal-footer">
                    <button onClick={() => setAbierto(false)} className="btn-outline">
                        Cancelar
                    </button>
                    <button onClick={handleGuardar} disabled={!razonSocial.trim() || cargando}
                        className="btn-primary">
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
