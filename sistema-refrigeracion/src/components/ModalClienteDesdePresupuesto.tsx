"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { crearCliente } from "@/actions/clientes";
import { vincularClienteAPresupuesto } from "@/actions/presupuestos";

interface Props {
    idPresupuesto: number;
    destinatarioNombre: string;
    destinatarioCuit: string | null;
    destinatarioDomicilio: string | null;
    destinatarioLocalidad: string | null;
    onCerrar: () => void;
}

export default function ModalClienteDesdePresupuesto({
    idPresupuesto,
    destinatarioNombre,
    destinatarioCuit,
    destinatarioDomicilio,
    destinatarioLocalidad,
    onCerrar,
}: Props) {
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const partesNombre = destinatarioNombre.trim().split(/\s+/);
    const [nombre, setNombre] = useState(partesNombre[0] ?? "");
    const [apellido, setApellido] = useState(partesNombre.slice(1).join(" "));
    const [cuit, setCuit] = useState(destinatarioCuit ?? "");
    const [telefono, setTelefono] = useState("");
    const [email, setEmail] = useState("");
    const [calle, setCalle] = useState(destinatarioDomicilio ?? "");
    const [localidad, setLocalidad] = useState(destinatarioLocalidad ?? "");

    useEffect(() => { setMounted(true); }, []);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!nombre.trim() || !apellido.trim()) {
            setError("Nombre y Apellido son obligatorios.");
            return;
        }

        setLoading(true);
        setError(null);

        const resCliente = await crearCliente({
            nombre: nombre.trim(),
            apellido: apellido.trim(),
            cuit: cuit.trim() || undefined,
            telefono: telefono.trim() || undefined,
            email: email.trim() || undefined,
            calle: calle.trim() || undefined,
            localidad: localidad.trim() || undefined,
        });

        if (!resCliente.success || !resCliente.cliente) {
            setLoading(false);
            setError("No se pudo crear el cliente.");
            return;
        }

        const resVinculo = await vincularClienteAPresupuesto(idPresupuesto, resCliente.cliente.id_cliente);

        setLoading(false);

        if (!resVinculo.success) {
            setError(resVinculo.error || "Cliente creado, pero no se pudo vincular al presupuesto.");
            return;
        }

        onCerrar();
    }

    const modal = (
        <div className="modal-backdrop">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col text-gray-800">
                <div className="modal-header">
                    <h3 className="text-xl font-bold">Agregar destinatario a Clientes</h3>
                    <button
                        type="button"
                        onClick={onCerrar}
                        className="text-white hover:text-white/80 transition"
                    >
                        <i className="fas fa-times text-lg"></i>
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="px-6 py-5 space-y-6 overflow-y-auto max-h-[70vh]">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2 font-bold">
                                {error}
                            </div>
                        )}

                        <section>
                            <h4 className="section-title">DATOS PERSONALES</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Nombre *</label>
                                    <input
                                        type="text"
                                        value={nombre}
                                        onChange={(e) => setNombre(e.target.value)}
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
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">DNI / CUIT</label>
                                    <input
                                        type="text"
                                        value={cuit}
                                        onChange={(e) => setCuit(e.target.value.replace(/[^\d\-]/g, '').slice(0, 20))}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Teléfono</label>
                                    <input
                                        type="text"
                                        value={telefono}
                                        onChange={(e) => setTelefono(e.target.value.replace(/[^\d\s\-\+\(\)]/g, '').slice(0, 20))}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                                    <input
                                        type="text"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                    />
                                </div>
                            </div>
                        </section>

                        <section>
                            <h4 className="section-title">DOMICILIO</h4>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Calle</label>
                                    <input
                                        type="text"
                                        value={calle}
                                        onChange={(e) => setCalle(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                    />
                                </div>
                                <div className="col-span-3">
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Localidad</label>
                                    <input
                                        type="text"
                                        value={localidad}
                                        onChange={(e) => setLocalidad(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                    />
                                </div>
                            </div>
                        </section>
                    </div>

                    <div className="modal-footer">
                        <button type="button" onClick={onCerrar} className="btn-outline">
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading} className="btn-primary">
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

    return mounted ? createPortal(modal, document.body) : null;
}
