"use client";

import { useState, useEffect, useRef } from "react";
import { crearPresupuesto, actualizarPresupuesto, buscarDestinatarios } from "@/actions/presupuestos";

interface Sugerencia {
    id_cliente: number | null;
    nombre: string;
    cuit: string;
    domicilio: string;
    localidad: string;
    condicion_iva: string;
}

interface Linea {
    _key: string;
    cantidad: string;
    descripcion: string;
    precio_unitario: string;
}

interface PresupuestoExistente {
    id_presupuesto: number;
    id_cliente: number | null;
    destinatario_nombre: string;
    destinatario_cuit: string | null;
    destinatario_domicilio: string | null;
    destinatario_localidad: string | null;
    destinatario_condicion_iva: string | null;
    fecha_emision: string;
    validez_dias: number;
    condicion_pago: string | null;
    alicuota_iva: number;
    observaciones: string | null;
    detalle_presupuesto: { cantidad: number; descripcion: string; precio_unitario: number }[];
}

interface Props {
    presupuestoAEditar?: PresupuestoExistente | null;
    onCerrar?: () => void;
}

const inputCls =
    "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400";

function nuevaLinea(): Linea {
    return { _key: `${Date.now()}-${Math.random()}`, cantidad: "1", descripcion: "", precio_unitario: "" };
}

export default function ModalPresupuesto({ presupuestoAEditar, onCerrar }: Props) {
    const [abierto, setAbierto] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [idCliente, setIdCliente] = useState<number | null>(null);
    const [destinatarioNombre, setDestinatarioNombre] = useState("");
    const [destinatarioCuit, setDestinatarioCuit] = useState("");
    const [destinatarioDomicilio, setDestinatarioDomicilio] = useState("");
    const [destinatarioLocalidad, setDestinatarioLocalidad] = useState("");
    const [destinatarioCondicionIva, setDestinatarioCondicionIva] = useState("");
    const [fechaEmision, setFechaEmision] = useState("");
    const [validezDias, setValidezDias] = useState("5");
    const [condicionPago, setCondicionPago] = useState("");
    const [alicuotaIva, setAlicuotaIva] = useState("21");
    const [observaciones, setObservaciones] = useState("");
    const [lineas, setLineas] = useState<Linea[]>([nuevaLinea()]);

    const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
    const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const editando = !!presupuestoAEditar;

    useEffect(() => {
        if (presupuestoAEditar) {
            setIdCliente(presupuestoAEditar.id_cliente);
            setDestinatarioNombre(presupuestoAEditar.destinatario_nombre);
            setDestinatarioCuit(presupuestoAEditar.destinatario_cuit || "");
            setDestinatarioDomicilio(presupuestoAEditar.destinatario_domicilio || "");
            setDestinatarioLocalidad(presupuestoAEditar.destinatario_localidad || "");
            setDestinatarioCondicionIva(presupuestoAEditar.destinatario_condicion_iva || "");
            setFechaEmision(presupuestoAEditar.fecha_emision.slice(0, 10));
            setValidezDias(String(presupuestoAEditar.validez_dias));
            setCondicionPago(presupuestoAEditar.condicion_pago || "");
            setAlicuotaIva(String(presupuestoAEditar.alicuota_iva));
            setObservaciones(presupuestoAEditar.observaciones || "");
            setLineas(
                presupuestoAEditar.detalle_presupuesto.map((l) => ({
                    _key: `${Date.now()}-${Math.random()}`,
                    cantidad: String(l.cantidad),
                    descripcion: l.descripcion,
                    precio_unitario: String(l.precio_unitario),
                }))
            );
            setAbierto(true);
        }
    }, [presupuestoAEditar]);

    function resetForm() {
        setIdCliente(null);
        setDestinatarioNombre("");
        setDestinatarioCuit("");
        setDestinatarioDomicilio("");
        setDestinatarioLocalidad("");
        setDestinatarioCondicionIva("");
        setFechaEmision("");
        setValidezDias("5");
        setCondicionPago("");
        setAlicuotaIva("21");
        setObservaciones("");
        setLineas([nuevaLinea()]);
        setSugerencias([]);
        setMostrarSugerencias(false);
        setError(null);
    }

    function cerrarModal() {
        setAbierto(false);
        resetForm();
        onCerrar?.();
    }

    function handleNombreChange(valor: string) {
        setDestinatarioNombre(valor);
        setIdCliente(null); // escribir libre desvincula la coincidencia previa

        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (valor.trim().length < 2) {
            setSugerencias([]);
            setMostrarSugerencias(false);
            return;
        }
        debounceRef.current = setTimeout(async () => {
            const resultado = await buscarDestinatarios(valor);
            setSugerencias(resultado);
            setMostrarSugerencias(resultado.length > 0);
        }, 300);
    }

    function elegirSugerencia(s: Sugerencia) {
        setIdCliente(s.id_cliente);
        setDestinatarioNombre(s.nombre);
        setDestinatarioCuit(s.cuit);
        setDestinatarioDomicilio(s.domicilio);
        setDestinatarioLocalidad(s.localidad);
        setDestinatarioCondicionIva(s.condicion_iva);
        setMostrarSugerencias(false);
    }

    function agregarLinea() {
        setLineas((prev) => [...prev, nuevaLinea()]);
    }

    function quitarLinea(key: string) {
        setLineas((prev) => (prev.length > 1 ? prev.filter((l) => l._key !== key) : prev));
    }

    function actualizarLinea(key: string, campo: keyof Linea, valor: string) {
        setLineas((prev) => prev.map((l) => (l._key === key ? { ...l, [campo]: valor } : l)));
    }

    const subtotal = lineas.reduce((acc, l) => acc + (Number(l.cantidad) || 0) * (Number(l.precio_unitario) || 0), 0);
    const montoIva = subtotal * (Number(alicuotaIva || "0") / 100);
    const total = subtotal + montoIva;

    async function handleGuardar() {
        if (!destinatarioNombre.trim()) {
            setError("Ingresá el nombre del destinatario.");
            return;
        }
        const lineasValidas = lineas.filter((l) => l.descripcion.trim() && Number(l.cantidad) > 0 && l.precio_unitario !== "");
        if (lineasValidas.length === 0) {
            setError("Agregá al menos una línea con descripción, cantidad y precio.");
            return;
        }

        setCargando(true);
        setError(null);

        const payload = {
            destinatario: {
                id_cliente: idCliente,
                nombre: destinatarioNombre.trim(),
                cuit: destinatarioCuit || undefined,
                domicilio: destinatarioDomicilio || undefined,
                localidad: destinatarioLocalidad || undefined,
                condicion_iva: destinatarioCondicionIva || undefined,
            },
            fecha_emision: fechaEmision ? new Date(fechaEmision) : undefined,
            validez_dias: Number(validezDias) || 5,
            condicion_pago: condicionPago || undefined,
            alicuota_iva: Number(alicuotaIva) || 21,
            observaciones: observaciones || undefined,
            lineas: lineasValidas.map((l, idx) => ({
                orden_linea: idx + 1,
                cantidad: Number(l.cantidad),
                descripcion: l.descripcion.trim(),
                precio_unitario: Number(l.precio_unitario),
            })),
        };

        const resultado = editando
            ? await actualizarPresupuesto(presupuestoAEditar!.id_presupuesto, payload)
            : await crearPresupuesto(payload);

        setCargando(false);

        if (resultado.success) {
            cerrarModal();
        } else {
            setError(resultado.error || "Error al guardar el presupuesto.");
        }
    }

    return (
        <>
            {!editando && (
                <button
                    onClick={() => { resetForm(); setAbierto(true); }}
                    className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition font-medium"
                >
                    + Nuevo Presupuesto
                </button>
            )}

            {abierto && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-9999 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col text-gray-800 overflow-hidden" style={{ maxHeight: 'calc(100vh - 2rem)' }}>

                        <div className="flex items-center justify-between px-6 py-4 border-b bg-linear-to-r from-blue-600 to-blue-700 text-white rounded-t-2xl">
                            <div>
                                <h3 className="text-lg font-bold tracking-wide">
                                    {editando ? "Editar Presupuesto" : "Nuevo Presupuesto"}
                                </h3>
                                <p className="text-blue-100 text-xs mt-0.5">
                                    Oferta comercial. No descuenta stock ni genera cuenta por cobrar.
                                </p>
                            </div>
                            <button onClick={cerrarModal} className="text-white/70 hover:text-white text-2xl leading-none transition">
                                &times;
                            </button>
                        </div>

                        <div className="px-6 py-5 space-y-5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>

                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2">
                                    {error}
                                </div>
                            )}

                            {/* ── Destinatario ── */}
                            <section className="relative">
                                <h4 className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3 border-b pb-1">
                                    Destinatario
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2 relative">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">
                                            Nombre / Razón Social *
                                        </label>
                                        <input
                                            type="text"
                                            value={destinatarioNombre}
                                            onChange={(e) => handleNombreChange(e.target.value)}
                                            onFocus={() => setMostrarSugerencias(sugerencias.length > 0)}
                                            onBlur={() => setTimeout(() => setMostrarSugerencias(false), 150)}
                                            placeholder="Cliente cargado o destinatario nuevo..."
                                            className={inputCls}
                                        />
                                        {idCliente && (
                                            <span className="absolute right-3 top-8 text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                                                Cliente vinculado
                                            </span>
                                        )}
                                        {mostrarSugerencias && (
                                            <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                {sugerencias.map((s, idx) => (
                                                    <button
                                                        type="button"
                                                        key={`${s.nombre}-${idx}`}
                                                        onMouseDown={() => elegirSugerencia(s)}
                                                        className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b last:border-0"
                                                    >
                                                        <div className="font-medium text-gray-800">{s.nombre}</div>
                                                        <div className="text-xs text-gray-400">
                                                            {s.id_cliente ? "Cliente cargado" : "Presupuesto anterior"}
                                                            {s.localidad ? ` · ${s.localidad}` : ""}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">CUIT</label>
                                        <input type="text" value={destinatarioCuit} onChange={(e) => setDestinatarioCuit(e.target.value)} className={inputCls} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Condición IVA</label>
                                        <input type="text" value={destinatarioCondicionIva} onChange={(e) => setDestinatarioCondicionIva(e.target.value)} placeholder="Responsable Inscripto, CF, ..." className={inputCls} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Domicilio</label>
                                        <input type="text" value={destinatarioDomicilio} onChange={(e) => setDestinatarioDomicilio(e.target.value)} className={inputCls} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Localidad</label>
                                        <input type="text" value={destinatarioLocalidad} onChange={(e) => setDestinatarioLocalidad(e.target.value)} className={inputCls} />
                                    </div>
                                </div>
                            </section>

                            {/* ── Datos del presupuesto ── */}
                            <section>
                                <h4 className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3 border-b pb-1">
                                    Datos del Presupuesto
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Fecha de Emisión</label>
                                        <input type="date" value={fechaEmision} onChange={(e) => setFechaEmision(e.target.value)} className={inputCls} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Validez (días)</label>
                                        <input type="number" min="1" value={validezDias} onChange={(e) => setValidezDias(e.target.value)} className={inputCls} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Condición de Pago</label>
                                        <input type="text" value={condicionPago} onChange={(e) => setCondicionPago(e.target.value)} placeholder="PAGO 15 DIAS FC" className={inputCls} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Alícuota IVA (%)</label>
                                        <input type="number" value={alicuotaIva} onChange={(e) => setAlicuotaIva(e.target.value)} className={inputCls} />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Observaciones</label>
                                        <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
                                    </div>
                                </div>
                            </section>

                            {/* ── Líneas ── */}
                            <section>
                                <h4 className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3 border-b pb-1">
                                    Ítems
                                </h4>
                                <div className="space-y-2">
                                    {lineas.map((l) => (
                                        <div key={l._key} className="grid grid-cols-12 gap-2 items-start">
                                            <input
                                                type="number"
                                                min="0.001"
                                                step="0.001"
                                                value={l.cantidad}
                                                onChange={(e) => actualizarLinea(l._key, "cantidad", e.target.value)}
                                                placeholder="Cant."
                                                className="col-span-2 border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                            />
                                            <textarea
                                                value={l.descripcion}
                                                onChange={(e) => actualizarLinea(l._key, "descripcion", e.target.value)}
                                                placeholder="Descripción del ítem"
                                                rows={1}
                                                className="col-span-6 border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                                            />
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={l.precio_unitario}
                                                onChange={(e) => actualizarLinea(l._key, "precio_unitario", e.target.value)}
                                                placeholder="Precio unit."
                                                className="col-span-3 border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => quitarLinea(l._key)}
                                                className="col-span-1 text-red-400 hover:text-red-600 transition font-bold text-lg leading-none pt-2"
                                                title="Quitar línea"
                                            >
                                                &times;
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={agregarLinea}
                                    className="mt-3 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold px-4 py-1.5 rounded-lg text-sm transition"
                                >
                                    + Agregar ítem
                                </button>

                                <div className="mt-4 flex justify-end">
                                    <div className="w-64 space-y-1 text-sm">
                                        <div className="flex justify-between text-gray-600">
                                            <span>Subtotal</span>
                                            <span>${subtotal.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-gray-600">
                                            <span>IVA ({alicuotaIva || 0}%)</span>
                                            <span>${montoIva.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between font-bold text-blue-800 border-t pt-1">
                                            <span>Total</span>
                                            <span>${total.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>

                        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
                            <button onClick={cerrarModal} className="px-5 py-2 text-sm border rounded-lg text-gray-600 hover:bg-gray-100 font-medium transition">
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
                                    "Guardar Presupuesto"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
