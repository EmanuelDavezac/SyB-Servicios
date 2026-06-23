"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { crearCliente } from "@/actions/clientes";

export default function ModalCliente() {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /* campos del formulario */
    const [nombre, setNombre] = useState("");
    const [apellido, setApellido] = useState("");
    const [cuit, setCuit] = useState("");
    const [telefono, setTelefono] = useState("");
    const [email, setEmail] = useState("");
    const [calle, setCalle] = useState("");
    const [numCalle, setNumCalle] = useState("");

    useEffect(() => { setMounted(true); }, []);

    function handleAbrir() {
        /* resetear el form cada vez que se abre */
        setNombre("");
        setApellido("");
        setCuit("");
        setTelefono("");
        setEmail("");
        setCalle("");
        setNumCalle("");
        setError(null);
        setIsOpen(true);
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!nombre.trim() || !apellido.trim()) {
            setError("Nombre y Apellido son obligatorios.");
            return;
        }

        setLoading(true);
        setError(null);

        const res = await crearCliente({
            nombre: nombre.trim(),
            apellido: apellido.trim(),
            cuit: cuit.trim() || undefined,
            telefono: telefono.trim() || undefined,
            email: email.trim() || undefined,
            calle: calle.trim() || undefined,
            num_calle: numCalle ? parseInt(numCalle) : undefined,
        });

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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-[9999] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col text-gray-800 overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-sky-600 to-sky-700 text-white rounded-t-2xl">
                    <div>
                        <h3 className="text-lg font-bold tracking-wide">Alta de Cliente</h3>
                        <p className="text-sky-100 text-xs mt-0.5">Completá los datos del nuevo cliente.</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="text-white/70 hover:text-white text-2xl leading-none transition"
                    >
                        &times;
                    </button>
                </div>

                {/* Formulario */}
                <form onSubmit={handleSubmit}>
                    <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[70vh]">

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2">
                                {error}
                            </div>
                        )}

                        {/* ── Identidad ── */}
                        <section>
                            <h4 className="text-xs font-bold uppercase tracking-widest text-sky-600 mb-3 border-b pb-1">
                                Datos personales
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Nombre *</label>
                                    <input
                                        type="text"
                                        value={nombre}
                                        onChange={(e) => setNombre(e.target.value)}
                                        placeholder="Ej: Juan"
                                        className={inputCls}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Apellido *</label>
                                    <input
                                        type="text"
                                        value={apellido}
                                        onChange={(e) => setApellido(e.target.value)}
                                        placeholder="Ej: Pérez"
                                        className={inputCls}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">DNI / CUIT</label>
                                    <input
                                        type="text"
                                        value={cuit}
                                        onChange={(e) => setCuit(e.target.value)}
                                        placeholder="Ej: 20-12345678-9"
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Teléfono</label>
                                    <input
                                        type="text"
                                        value={telefono}
                                        onChange={(e) => setTelefono(e.target.value)}
                                        placeholder="Ej: 351 123-4567"
                                        className={inputCls}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Ej: juan@mail.com"
                                        className={inputCls}
                                    />
                                </div>
                            </div>
                        </section>

                        {/* ── Domicilio ── */}
                        <section>
                            <h4 className="text-xs font-bold uppercase tracking-widest text-sky-600 mb-3 border-b pb-1">
                                Domicilio
                            </h4>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Calle</label>
                                    <input
                                        type="text"
                                        value={calle}
                                        onChange={(e) => setCalle(e.target.value)}
                                        placeholder="Ej: Av. Colón"
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Número</label>
                                    <input
                                        type="number"
                                        value={numCalle}
                                        onChange={(e) => setNumCalle(e.target.value)}
                                        placeholder="1234"
                                        className={inputCls}
                                    />
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="px-5 py-2 text-sm border rounded-lg text-gray-600 hover:bg-gray-100 font-medium transition"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-5 py-2 text-sm bg-sky-600 text-white rounded-lg hover:bg-sky-700 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                                    Guardando...
                                </span>
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
            <button
                onClick={handleAbrir}
                className="bg-sky-600 text-white px-4 py-2 rounded shadow hover:bg-sky-700 transition"
            >
                + Nuevo Cliente
            </button>
            {isOpen && mounted && createPortal(modal, document.body)}
        </>
    );
}