"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { crearCliente, actualizarCliente } from "@/actions/clientes";

interface ClienteExistente {
    id_cliente: number;
    nombre: string;
    apellido: string;
    cuit: string | null;
    telefono: string | null;
    email: string | null;
    calle: string | null;
    num_calle: number | null;
    localidad: string | null;
}

interface Props {
    cliente?: ClienteExistente;
}

export default function ModalCliente({ cliente }: Props) {
    const esEdicion = !!cliente;
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [errores, setErrores] = useState<{ cuit?: string; telefono?: string; email?: string }>({});

    /* campos del formulario */
    const [nombre, setNombre] = useState("");
    const [apellido, setApellido] = useState("");
    const [cuit, setCuit] = useState("");
    const [telefono, setTelefono] = useState("");
    const [email, setEmail] = useState("");
    const [calle, setCalle] = useState("");
    const [numCalle, setNumCalle] = useState("");
    const [localidad, setLocalidad] = useState("");

    useEffect(() => { setMounted(true); }, []);

    function handleAbrir() {
        /* precargar datos del cliente si es edición, resetear si es alta */
        setNombre(cliente?.nombre ?? "");
        setApellido(cliente?.apellido ?? "");
        setCuit(cliente?.cuit ?? "");
        setTelefono(cliente?.telefono ?? "");
        setEmail(cliente?.email ?? "");
        setCalle(cliente?.calle ?? "");
        setNumCalle(cliente?.num_calle != null ? String(cliente.num_calle) : "");
        setLocalidad(cliente?.localidad ?? "");
        setError(null);
        setErrores({});
        setIsOpen(true);
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!nombre.trim() || !apellido.trim()) {
            setError("Nombre y Apellido son obligatorios.");
            return;
        }

        const nuevosErrores: typeof errores = {};
        if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            nuevosErrores.email = "El email no tiene un formato válido.";
        }
        if (Object.keys(nuevosErrores).length > 0) {
            setErrores(nuevosErrores);
            return;
        }

        setLoading(true);
        setError(null);
        setErrores({});

        const datos = {
            nombre: nombre.trim(),
            apellido: apellido.trim(),
            cuit: cuit.trim() || undefined,
            telefono: telefono.trim() || undefined,
            email: email.trim() || undefined,
            calle: calle.trim() || undefined,
            num_calle: numCalle ? parseInt(numCalle) : undefined,
            localidad: localidad.trim() || undefined,
        };

        const res = esEdicion
            ? await actualizarCliente(cliente.id_cliente, datos)
            : await crearCliente(datos);

        setLoading(false);

        if (res.success) {
            setIsOpen(false);
        } else {
            setError("Hubo un error al intentar guardar el cliente.");
        }
    }

    const inputCls =
        "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400";

    const modal = (
        <div className="modal-backdrop">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col text-gray-800">

                {/* Header */}
                <div className="modal-header">
                    <h3 className="text-xl font-bold">{esEdicion ? "Editar Cliente" : "Alta de Cliente"}</h3>
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="text-white hover:text-white/80 transition"
                    >
                        <i className="fas fa-times text-lg"></i>
                    </button>
                </div>

                {/* Formulario */}
                <form onSubmit={handleSubmit}>
                    <div className="px-6 py-5 space-y-6 overflow-y-auto max-h-[70vh]">

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2 font-bold">
                                {error}
                            </div>
                        )}

                        {/* ── Identidad ── */}
                        <section>
                            <h4 className="section-title">DATOS PERSONALES</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Nombre *</label>
                                    <input
                                        type="text"
                                        value={nombre}
                                        onChange={(e) => setNombre(e.target.value)}
                                        placeholder="Ej: Juan"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Apellido *</label>
                                    <input
                                        type="text"
                                        value={apellido}
                                        onChange={(e) => setApellido(e.target.value)}
                                        placeholder="Ej: Pérez"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">DNI / CUIT</label>
                                    <input
                                        type="text"
                                        value={cuit}
                                        onChange={(e) => {
                                            setCuit(e.target.value.replace(/[^\d\-]/g, '').slice(0, 20));
                                            setErrores((prev) => ({ ...prev, cuit: undefined }));
                                        }}
                                        placeholder="Ej: 20-12345678-9"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Teléfono</label>
                                    <input
                                        type="text"
                                        value={telefono}
                                        onChange={(e) => {
                                            setTelefono(e.target.value.replace(/[^\d\s\-\+\(\)]/g, '').slice(0, 20));
                                            setErrores((prev) => ({ ...prev, telefono: undefined }));
                                        }}
                                        placeholder="Ej: 351 123-4567"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                                    <input
                                        type="text"
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value);
                                            setErrores((prev) => ({ ...prev, email: undefined }));
                                        }}
                                        placeholder="Ej: juan@mail.com"
                                        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 bg-white ${errores.email ? "border-red-400 focus:ring-red-400" : "border-gray-300 focus:ring-blue-500"}`}
                                    />
                                    {errores.email && <p className="text-red-500 text-xs mt-1">{errores.email}</p>}
                                </div>
                            </div>
                        </section>

                        {/* ── Domicilio ── */}
                        <section>
                            <h4 className="section-title">DOMICILIO</h4>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Calle</label>
                                    <input
                                        type="text"
                                        value={calle}
                                        onChange={(e) => setCalle(e.target.value)}
                                        placeholder="Ej: Av. Colón"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Número</label>
                                    <input
                                        type="number"
                                        value={numCalle}
                                        onChange={(e) => setNumCalle(e.target.value)}
                                        placeholder="1234"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                    />
                                </div>
                                <div className="col-span-3">
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Localidad</label>
                                    <input
                                        type="text"
                                        value={localidad}
                                        onChange={(e) => setLocalidad(e.target.value)}
                                        placeholder="Ej: Recreo, Santa Fe"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                    />
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Footer */}
                    <div className="modal-footer">
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="btn-outline"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                                    Guardando...
                                </span>
                            ) : esEdicion ? (
                                "Guardar Cambios"
                            ) : (
                                "Guardar Cliente"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    return (
        <>
            {esEdicion ? (
                <button
                    onClick={handleAbrir}
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                    title="Editar"
                >
                    <i className="fas fa-edit" />
                </button>
            ) : (
                <button
                    onClick={handleAbrir}
                    className="bg-sky-600 text-white px-4 py-2 rounded shadow hover:bg-sky-700 transition"
                >
                    + Nuevo Cliente
                </button>
            )}
            {isOpen && mounted && createPortal(modal, document.body)}
        </>
    );
}