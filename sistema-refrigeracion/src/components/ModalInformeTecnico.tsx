"use client";

import { useState, useEffect } from "react";
import { crearInformeTecnico } from "@/actions/informesTecnicos";

interface Cliente {
    id_cliente: number;
    nombre: string;
    apellido: string;
    cuit: string | null;
    calle: string | null;
    num_calle: number | null;
    localidad: string | null;
}

interface Props {
    clientes: Cliente[];
}

const inputCls =
    "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400";

export default function ModalInformeTecnico({ clientes }: Props) {
    const [abierto, setAbierto] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [idCliente, setIdCliente] = useState("");
    const [numero, setNumero] = useState("");
    const [destinatario, setDestinatario] = useState("");
    const [cuit, setCuit] = useState("");
    const [calle, setCalle] = useState("");
    const [numCalle, setNumCalle] = useState("");
    const [localidad, setLocalidad] = useState("");
    const [descripcion, setDescripcion] = useState("");

    const fechaHoy = new Date().toLocaleDateString("es-AR");

    useEffect(() => {
        if (!abierto) {
            setIdCliente("");
            setNumero("");
            setDestinatario("");
            setCuit("");
            setCalle("");
            setNumCalle("");
            setLocalidad("");
            setDescripcion("");
            setError(null);
        }
    }, [abierto]);

    function handleSeleccionCliente(id: string) {
        setIdCliente(id);
        const cliente = clientes.find((c) => String(c.id_cliente) === id);
        if (cliente) {
            setDestinatario(`${cliente.nombre} ${cliente.apellido}`);
            setCuit(cliente.cuit || "");
            setCalle(cliente.calle || "");
            setNumCalle(cliente.num_calle !== null ? String(cliente.num_calle) : "");
            setLocalidad(cliente.localidad || "");
        }
    }

    async function handleGuardar() {
        if (!destinatario.trim()) {
            setError("Completá a quién va destinado el informe.");
            return;
        }
        if (!descripcion.trim()) {
            setError("Completá el contenido del informe.");
            return;
        }

        setCargando(true);
        setError(null);

        const resultado = await crearInformeTecnico({
            id_cliente: idCliente ? Number(idCliente) : null,
            numero: numero || undefined,
            destinatario: destinatario.trim(),
            cuit: cuit || undefined,
            calle: calle || undefined,
            num_calle: numCalle ? Number(numCalle) : undefined,
            localidad: localidad || undefined,
            descripcion: descripcion.trim(),
        });

        setCargando(false);

        if (resultado.success) {
            setAbierto(false);
        } else {
            setError(resultado.error || "Error al crear el informe técnico.");
        }
    }

    return (
        <>
            <button
                onClick={() => setAbierto(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition font-medium"
            >
                + Nuevo Informe Técnico
            </button>

            {abierto && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-[9999] p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col text-gray-800 overflow-hidden" style={{ maxHeight: 'calc(100vh - 2rem)' }}>

                        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-2xl">
                            <div>
                                <h3 className="text-lg font-bold tracking-wide">Nuevo Informe Técnico</h3>
                                <p className="text-blue-100 text-xs mt-0.5">
                                    Documenta el trabajo realizado. No genera deuda ni se cobra.
                                </p>
                            </div>
                            <button
                                onClick={() => setAbierto(false)}
                                className="text-white/70 hover:text-white text-2xl leading-none transition"
                            >
                                &times;
                            </button>
                        </div>

                        <div className="px-6 py-5 space-y-5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>

                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2">
                                    {error}
                                </div>
                            )}

                            <section>
                                <h4 className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3 border-b pb-1">
                                    Datos del Informe
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">
                                            Número (Opcional)
                                        </label>
                                        <input
                                            type="text"
                                            value={numero}
                                            onChange={(e) => setNumero(e.target.value)}
                                            placeholder="0001"
                                            className={inputCls}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">
                                            Fecha
                                        </label>
                                        <div className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500">
                                            {fechaHoy}
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h4 className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3 border-b pb-1">
                                    Destinatario
                                </h4>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">
                                            Cliente cargado (Opcional, autocompleta los datos)
                                        </label>
                                        <select
                                            value={idCliente}
                                            onChange={(e) => handleSeleccionCliente(e.target.value)}
                                            className={inputCls}
                                        >
                                            <option value="">Sin seleccionar...</option>
                                            {clientes.map((c) => (
                                                <option key={c.id_cliente} value={c.id_cliente}>
                                                    {c.apellido}, {c.nombre}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">
                                            A quién va destinado *
                                        </label>
                                        <input
                                            type="text"
                                            value={destinatario}
                                            onChange={(e) => setDestinatario(e.target.value)}
                                            placeholder="Nombre y apellido / Razón social"
                                            className={inputCls}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                                CUIT
                                            </label>
                                            <input
                                                type="text"
                                                value={cuit}
                                                onChange={(e) => setCuit(e.target.value)}
                                                className={inputCls}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                                Localidad
                                            </label>
                                            <input
                                                type="text"
                                                value={localidad}
                                                onChange={(e) => setLocalidad(e.target.value)}
                                                className={inputCls}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="col-span-2">
                                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                                Domicilio (Calle)
                                            </label>
                                            <input
                                                type="text"
                                                value={calle}
                                                onChange={(e) => setCalle(e.target.value)}
                                                className={inputCls}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                                Número
                                            </label>
                                            <input
                                                type="number"
                                                value={numCalle}
                                                onChange={(e) => setNumCalle(e.target.value)}
                                                className={inputCls}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h4 className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3 border-b pb-1">
                                    Contenido del Informe
                                </h4>
                                <textarea
                                    value={descripcion}
                                    onChange={(e) => setDescripcion(e.target.value)}
                                    rows={6}
                                    placeholder="Diagnóstico, trabajo realizado, recomendaciones..."
                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                                />
                            </section>
                        </div>

                        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
                            <button
                                onClick={() => setAbierto(false)}
                                className="px-5 py-2 text-sm border rounded-lg text-gray-600 hover:bg-gray-100 font-medium transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleGuardar}
                                disabled={cargando}
                                className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {cargando ? (
                                    <>
                                        <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                                        Guardando...
                                    </>
                                ) : (
                                    "Guardar Informe"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
