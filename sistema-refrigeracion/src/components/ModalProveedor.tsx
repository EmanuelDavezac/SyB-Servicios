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
    const [errores, setErrores] = useState<{ email?: string }>({});

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

        if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            setErrores({ email: "El email no tiene un formato válido." });
            return;
        }
        setErrores({});
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

    const inputCls =
        "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400";

    const modalContent = (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-[9999] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col text-gray-800 overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-sky-600 to-sky-700 text-white rounded-t-2xl">
                    <div>
                        <h3 className="text-lg font-bold tracking-wide">
                            {modoEdicion ? "Editar Proveedor" : "Nuevo Proveedor"}
                        </h3>
                        <p className="text-sky-100 text-xs mt-0.5">
                            {modoEdicion ? "Modificá los datos del proveedor." : "Completá los datos del nuevo proveedor."}
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

                    {/* ── Datos del proveedor ── */}
                    <section>
                        <h4 className="text-xs font-bold uppercase tracking-widest text-sky-600 mb-3 border-b pb-1">
                            Datos del proveedor
                        </h4>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Razón Social *</label>
                                <input
                                    type="text"
                                    value={razonSocial}
                                    onChange={(e) => setRazonSocial(e.target.value)}
                                    placeholder="Ej: Distribuidora Frío Sur S.A."
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Nombre de Contacto</label>
                                <input
                                    type="text"
                                    value={nombreProveedor}
                                    onChange={(e) => setNombreProveedor(e.target.value)}
                                    placeholder="Ej: Juan García"
                                    className={inputCls}
                                />
                            </div>
                        </div>
                    </section>

                    {/* ── Contacto ── */}
                    <section>
                        <h4 className="text-xs font-bold uppercase tracking-widest text-sky-600 mb-3 border-b pb-1">
                            Contacto
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">CUIT (solo números)</label>
                                <input
                                    type="text"
                                    value={cuit}
                                    onChange={(e) => setCuit(e.target.value.replace(/\D/g, '').slice(0, 11))}
                                    placeholder="Ej: 30123456789"
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Teléfono (solo números)</label>
                                <input
                                    type="text"
                                    value={telefono}
                                    onChange={(e) => setTelefono(e.target.value.replace(/\D/g, '').slice(0, 20))}
                                    placeholder="Ej: 3511234567"
                                    className={inputCls}
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                                <input
                                    type="text"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        setErrores({});
                                    }}
                                    placeholder="Ej: ventas@distribuidora.com"
                                    className={`${inputCls} ${errores.email ? "border-red-400 ring-1 ring-red-400" : ""}`}
                                />
                                {errores.email && <p className="text-red-500 text-xs mt-1">{errores.email}</p>}
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
                        disabled={!razonSocial.trim() || cargando}
                        className="px-5 py-2 text-sm bg-sky-600 text-white rounded-lg hover:bg-sky-700 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {cargando ? (
                            <span className="flex items-center gap-2">
                                <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                                Guardando...
                            </span>
                        ) : (
                            modoEdicion ? "Guardar Cambios" : "Guardar Proveedor"
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
                    + Nuevo Proveedor
                </button>
            )}
            {abierto && mounted && createPortal(modalContent, document.body)}
        </>
    );
}
