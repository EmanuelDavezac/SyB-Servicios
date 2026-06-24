"use client";

import { useState, useEffect } from "react";
import { crearFactura } from "@/actions/facturacion";
import { obtenerInsumos } from "@/actions/insumos";

interface Cliente {
    id_cliente: number;
    nombre: string;
    apellido: string;
}

interface Orden {
    id_orden: number;
    cliente: Cliente | null;
}

interface Insumo {
    id_insumo: number;
    nombre: string;
    stock_actual: number | null;
    precio_venta: number;
}

interface Props {
    ordenes: Orden[];
    openWithOrdenId?: string;
}

export default function ModalFactura({ ordenes, openWithOrdenId }: Props) {
    const [abierto, setAbierto] = useState(false);
    const [cargando, setCargando] = useState(false);

    const [idOrden, setIdOrden] = useState("");
    const [tipo, setTipo] = useState("Factura");
    const [letraNumero, setLetraNumero] = useState(""); // Ej: A-0001
    const [montoTotal, setMontoTotal] = useState("");
    const [estadoPago, setEstadoPago] = useState("PENDIENTE");
    const [fechaVencimiento, setFechaVencimiento] = useState("");
    const [descripcion, setDescripcion] = useState("");

    // Insumos logic
    const [insumosDisponibles, setInsumosDisponibles] = useState<Insumo[]>([]);
    const [insumosSeleccionados, setInsumosSeleccionados] = useState<{ id_insumo: number, nombre: string, cantidad: number }[]>([]);
    const [idInsumoSeleccionado, setIdInsumoSeleccionado] = useState("");
    const [cantidadInsumo, setCantidadInsumo] = useState("1");

    // Detect if we entered the page with the intent to generate for a specific order
    useEffect(() => {
        if (openWithOrdenId) {
            setIdOrden(openWithOrdenId);
            setLetraNumero(`A-${openWithOrdenId.padStart(4, '0')}`);
            setEstadoPago("PAGADA");
            setAbierto(true);

            // Note: because the query string naturally stays in the URL, if they hit refresh it will re-open.
            // In a more robust system you'd use router.replace('/facturacion') after opening, but this handles the UX flawlessly.
        }
    }, [openWithOrdenId]);

    useEffect(() => {
        if (abierto) {
            async function cargarInsumos() {
                const data = await obtenerInsumos();
                setInsumosDisponibles(data as Insumo[]);
            }
            cargarInsumos();
        }
    }, [abierto]);

    function agregarInsumo() {
        if (!idInsumoSeleccionado) return;
        const insumo = insumosDisponibles.find(i => i.id_insumo === Number(idInsumoSeleccionado));
        if (insumo) {
            setInsumosSeleccionados(prev => [
                ...prev,
                { id_insumo: insumo.id_insumo, nombre: insumo.nombre, cantidad: Number(cantidadInsumo) }
            ]);
            setIdInsumoSeleccionado("");
            setCantidadInsumo("1");
        }
    }

    function quitarInsumo(index: number) {
        setInsumosSeleccionados(prev => prev.filter((_, i) => i !== index));
    }

    async function handleGuardar() {
        if (!idOrden || !tipo || !montoTotal) {
            alert("Por favor completa la Orden, Tipo y Monto.");
            return;
        }

        setCargando(true);
        const resultado = await crearFactura({
            id_orden: Number(idOrden),
            tipo: tipo,
            num_factura: `${tipo} ${letraNumero}`.trim(),
            monto_total: parseFloat(montoTotal),
            estado_pago: estadoPago,
            fecha_vencimiento: fechaVencimiento ? new Date(fechaVencimiento) : undefined,
            descripcion: descripcion || undefined,
            insumos: insumosSeleccionados.map(i => ({ id_insumo: i.id_insumo, cantidad: i.cantidad })),
        });
        setCargando(false);

        if (resultado.success) {
            setAbierto(false);
            setIdOrden("");
            setTipo("Factura");
            setLetraNumero("");
            setMontoTotal("");
            setEstadoPago("PENDIENTE");
            setFechaVencimiento("");
            setDescripcion("");
            setInsumosSeleccionados([]);
        } else {
            alert(resultado.error || "Error al crear la factura.");
        }
    }

    return (
        <>
            <button
                onClick={() => setAbierto(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition font-medium"
            >
                + Nuevo Comprobante Manual
            </button>

            {abierto && (
                <div className="modal-backdrop overflow-y-auto">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col text-gray-800 my-auto">

                        <div className="modal-header">
                            <h3 className="text-xl font-bold">Nuevo Comprobante</h3>
                            <button onClick={() => setAbierto(false)} className="text-white hover:text-white/80 transition">
                                <i className="fas fa-times text-lg"></i>
                            </button>
                        </div>

                        <div className="px-6 py-5 space-y-6 overflow-y-auto max-h-[75vh]">
                            
                            <section>
                                <h4 className="section-title">DATOS DEL COMPROBANTE</h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Orden de Trabajo Terminada *</label>
                                        <select value={idOrden} onChange={(e) => setIdOrden(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                                            <option value="">Selecciona una orden...</option>
                                            {ordenes.map((o) => (
                                                <option key={o.id_orden} value={o.id_orden}>
                                                    Orden #{o.id_orden} - {o.cliente?.apellido}, {o.cliente?.nombre}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Tipo *</label>
                                            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                                                <option value="Factura">Factura</option>
                                                <option value="Presupuesto">Presupuesto</option>
                                                <option value="Remito">Remito</option>
                                                <option value="Recibo">Recibo</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Número</label>
                                            <input
                                                type="text"
                                                value={letraNumero}
                                                onChange={(e) => setLetraNumero(e.target.value)}
                                                placeholder="A-0001"
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Monto Total *</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-2 text-gray-400">$</span>
                                                <input
                                                    type="number"
                                                    value={montoTotal}
                                                    onChange={(e) => setMontoTotal(e.target.value)}
                                                    placeholder="0.00"
                                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 pl-7 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Estado Pago *</label>
                                            <select value={estadoPago} onChange={(e) => setEstadoPago(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                                                <option value="PAGADA">PAGADA</option>
                                                <option value="IMPAGA">IMPAGA</option>
                                                <option value="PENDIENTE">PENDIENTE</option>
                                                <option value="ENTREGADO">ENTREGADO</option>
                                                <option value="ANULADA">ANULADA</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Descripción / Notas</label>
                                        <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white resize-none" placeholder="Notas adicionales..." />
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h4 className="section-title">DETALLE DE INSUMOS</h4>
                                <div className="space-y-4">
                                    <div className="flex gap-2">
                                        <select
                                            value={idInsumoSeleccionado}
                                            onChange={(e) => setIdInsumoSeleccionado(e.target.value)}
                                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                                        >
                                            <option value="">Seleccionar insumo...</option>
                                            {insumosDisponibles.map(insumo => (
                                                <option key={insumo.id_insumo} value={insumo.id_insumo}>
                                                    {insumo.nombre} (Stock: {insumo.stock_actual ?? 0})
                                                </option>
                                            ))}
                                        </select>
                                        <input
                                            type="number"
                                            value={cantidadInsumo}
                                            onChange={(e) => setCantidadInsumo(e.target.value)}
                                            className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                                            min="1"
                                        />
                                        <button
                                            type="button"
                                            onClick={agregarInsumo}
                                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-bold"
                                        >
                                            +
                                        </button>
                                    </div>

                                    {insumosSeleccionados.length > 0 && (
                                        <div className="space-y-2">
                                            {insumosSeleccionados.map((item, index) => (
                                                <div key={index} className="flex justify-between items-center text-sm bg-gray-50 border border-gray-100 rounded-lg px-4 py-2">
                                                    <span className="font-medium text-gray-700">{item.nombre} x {item.cantidad}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => quitarInsumo(index)}
                                                        className="text-red-400 hover:text-red-600 transition"
                                                    >
                                                        <i className="fas fa-trash-alt text-xs"></i>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </section>

                        </div>

                        <div className="modal-footer">
                            <button onClick={() => setAbierto(false)} className="btn-outline">
                                Cancelar
                            </button>
                            <button onClick={handleGuardar} disabled={cargando} className="btn-primary">
                                {cargando ? "Guardando..." : "Guardar Comprobante"}
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </>
    );
}
