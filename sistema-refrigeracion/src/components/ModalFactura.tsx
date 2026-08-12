"use client";

import { useState, useEffect } from "react";
import { crearFactura } from "@/actions/facturacion";
import { obtenerInsumos } from "@/actions/insumos";
import { obtenerInsumosDeOrden } from "@/actions/ordenes";

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

const inputCls =
    "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400";

export default function ModalFactura({ ordenes, openWithOrdenId }: Props) {
    const [abierto, setAbierto] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [idOrden, setIdOrden] = useState("");
    const [tipo, setTipo] = useState("Factura");
    const [letraNumero, setLetraNumero] = useState("");
    const [montoTotal, setMontoTotal] = useState("");
    const [estadoPago, setEstadoPago] = useState("PENDIENTE");
    const [fechaVencimiento, setFechaVencimiento] = useState("");
    const [descripcion, setDescripcion] = useState("");

    /* Insumos */
    const [insumosDisponibles, setInsumosDisponibles] = useState<Insumo[]>([]);
    const [insumosSeleccionados, setInsumosSeleccionados] = useState<
        { _key: string; id_insumo: number; nombre: string; cantidad: number }[]
    >([]);
    const [idInsumoSeleccionado, setIdInsumoSeleccionado] = useState("");
    const [cantidadInsumo, setCantidadInsumo] = useState("1");

    /* Insumos ya registrados en la orden (pre-cargados) */
    const [insumosDeOrden, setInsumosDeOrden] = useState<
        { id_detalle_ins?: number; id_detalle_ord_insumo?: number; cantidad_usada: number; insumo: { nombre: string } | null }[]
    >([]);

    /* Abrir con orden preseleccionada desde URL */
    useEffect(() => {
        if (openWithOrdenId) {
            setIdOrden(openWithOrdenId);
            setLetraNumero(`A-${openWithOrdenId.padStart(4, "0")}`);
            setEstadoPago("PAGADA");
            setAbierto(true);
        }
    }, [openWithOrdenId]);

    /* Cargar insumos al abrir */
    useEffect(() => {
        if (abierto) {
            obtenerInsumos().then((data) => setInsumosDisponibles(data as Insumo[]));
        }
    }, [abierto]);

    /* Cargar insumos de la orden al seleccionarla */
    useEffect(() => {
        if (idOrden) {
            obtenerInsumosDeOrden(Number(idOrden)).then((data: any) => setInsumosDeOrden(data));
        } else {
            setInsumosDeOrden([]);
        }
    }, [idOrden]);

    /* Orden seleccionada — se usa para autocompletar cliente y N° de orden */
    const ordenSeleccionada = ordenes.find((o) => String(o.id_orden) === idOrden);

    function agregarInsumo() {
        if (!idInsumoSeleccionado) return;
        const insumo = insumosDisponibles.find(
            (i) => i.id_insumo === Number(idInsumoSeleccionado)
        );
        if (insumo) {
            setInsumosSeleccionados((prev) => [
                ...prev,
                { _key: `${insumo.id_insumo}-${Date.now()}-${Math.random()}`, id_insumo: insumo.id_insumo, nombre: insumo.nombre, cantidad: Number(cantidadInsumo) },
            ]);
            setIdInsumoSeleccionado("");
            setCantidadInsumo("1");
        }
    }

    function quitarInsumo(key: string) {
        setInsumosSeleccionados((prev) => prev.filter((item) => item._key !== key));
    }

    function resetForm() {
        setIdOrden("");
        setTipo("Factura");
        setLetraNumero("");
        setMontoTotal("");
        setEstadoPago("PENDIENTE");
        setFechaVencimiento("");
        setDescripcion("");
        setInsumosSeleccionados([]);
        setInsumosDeOrden([]);
        setError(null);
    }

    async function handleGuardar() {
        if (!idOrden || !tipo || !montoTotal) {
            setError("Completá la Orden, Tipo y Monto antes de guardar.");
            return;
        }

        setCargando(true);
        setError(null);

        const resultado = await crearFactura({
            id_orden: Number(idOrden),
            tipo,
            num_factura: `${tipo} ${letraNumero}`.trim(),
            monto_total: parseFloat(montoTotal),
            estado_pago: estadoPago,
            fecha_vencimiento: fechaVencimiento ? new Date(fechaVencimiento) : undefined,
            descripcion: descripcion || undefined,
            insumos: insumosSeleccionados.map((i) => ({
                id_insumo: i.id_insumo,
                cantidad: i.cantidad,
            })),
        });

        setCargando(false);

        if (resultado.success) {
            setAbierto(false);
            resetForm();
        } else {
            setError(resultado.error || "Error al crear la factura.");
        }
    }

    return (
        <>
            <button
                onClick={() => { resetForm(); setAbierto(true); }}
                className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition font-medium"
            >
                + Nuevo Comprobante Manual
            </button>

            {abierto && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-[9999] p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col text-gray-800 overflow-hidden" style={{ maxHeight: 'calc(100vh - 2rem)' }}>

                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-2xl">
                            <div>
                                <h3 className="text-lg font-bold tracking-wide">Nuevo Comprobante</h3>
                                <p className="text-blue-100 text-xs mt-0.5">
                                    Generá una factura, recibo, remito o presupuesto.
                                </p>
                            </div>
                            <button
                                onClick={() => setAbierto(false)}
                                className="text-white/70 hover:text-white text-2xl leading-none transition"
                            >
                                &times;
                            </button>
                        </div>

                        {/* Cuerpo */}
                        <div className="px-6 py-5 space-y-5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>

                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2">
                                    {error}
                                </div>
                            )}

                            {/* ── Orden ── */}
                            <section>
                                <h4 className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3 border-b pb-1">
                                    Orden de Trabajo
                                </h4>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">
                                        Orden Terminada *
                                    </label>
                                    <select
                                        value={idOrden}
                                        onChange={(e) => setIdOrden(e.target.value)}
                                        className={inputCls}
                                    >
                                        <option value="">Seleccioná una orden...</option>
                                        {ordenes.map((o, idx) => (
                                            <option key={o.id_orden ?? `orden-opt-${idx}`} value={o.id_orden}>
                                                Orden #{o.id_orden} — {o.cliente?.apellido}, {o.cliente?.nombre}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Autocompletado: cliente y N° de orden */}
                                {ordenSeleccionada && (
                                    <div className="mt-3 flex items-center justify-between bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs">
                                        <span className="text-blue-800 font-semibold">
                                            Cliente: {ordenSeleccionada.cliente
                                                ? `${ordenSeleccionada.cliente.apellido}, ${ordenSeleccionada.cliente.nombre}`
                                                : "Sin cliente asignado"}
                                        </span>
                                        <span className="text-blue-600 font-bold">
                                            N° Orden: #{String(ordenSeleccionada.id_orden).padStart(5, "0")}
                                        </span>
                                    </div>
                                )}
                            </section>

                            {/* ── Comprobante ── */}
                            <section>
                                <h4 className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3 border-b pb-1">
                                    Datos del Comprobante
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Tipo *</label>
                                        <select
                                            value={tipo}
                                            onChange={(e) => setTipo(e.target.value)}
                                            className={inputCls}
                                        >
                                            <option value="Factura">Factura</option>
                                            <option value="Presupuesto">Presupuesto</option>
                                            <option value="Remito">Remito</option>
                                            <option value="Recibo">Recibo</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">
                                            Número (Ej: A-0001)
                                        </label>
                                        <input
                                            type="text"
                                            value={letraNumero}
                                            onChange={(e) => setLetraNumero(e.target.value)}
                                            placeholder="A-0001"
                                            className={inputCls}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">
                                            Monto Total * ($)
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2 text-gray-400 text-sm">$</span>
                                            <input
                                                type="number"
                                                value={montoTotal}
                                                onChange={(e) => setMontoTotal(e.target.value)}
                                                placeholder="0.00"
                                                className="w-full border rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">
                                            Estado de Pago *
                                        </label>
                                        <select
                                            value={estadoPago}
                                            onChange={(e) => setEstadoPago(e.target.value)}
                                            className={inputCls}
                                        >
                                            <option value="PAGADA">PAGADA</option>
                                            <option value="IMPAGA">IMPAGA</option>
                                            <option value="PENDIENTE">PENDIENTE</option>
                                            <option value="ENTREGADO">ENTREGADO</option>
                                            <option value="ANULADA">ANULADA</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">
                                            Vencimiento (Opcional)
                                        </label>
                                        <input
                                            type="date"
                                            value={fechaVencimiento}
                                            onChange={(e) => setFechaVencimiento(e.target.value)}
                                            className={inputCls}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">
                                            Descripción / Notas
                                        </label>
                                        <textarea
                                            value={descripcion}
                                            onChange={(e) => setDescripcion(e.target.value)}
                                            rows={2}
                                            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* ── Insumos ── */}
                            <section>
                                <h4 className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3 border-b pb-1">
                                    Insumos de Stock
                                    <span className="ml-2 text-[10px] font-normal normal-case tracking-normal text-gray-400">
                                        (se descontarán del stock al guardar)
                                    </span>
                                </h4>

                                {/* Insumos pre-registrados en la orden */}
                                {insumosDeOrden.length > 0 && (
                                    <div className="mb-3">
                                        <p className="text-xs font-semibold text-orange-600 mb-1.5 flex items-center gap-1">
                                            <span>📦</span> Insumos registrados en la orden:
                                        </p>
                                        <div className="space-y-1">
                                            {insumosDeOrden.map((d, idx) => (
                                                <div
                                                    key={d.id_detalle_ins ?? d.id_detalle_ord_insumo ?? `ord-ins-${idx}`}
                                                    className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-sm"
                                                >
                                                    <span className="font-medium text-orange-900">
                                                        {d.insumo?.nombre ?? "Insumo"}
                                                    </span>
                                                    <span className="text-orange-600 text-xs font-semibold">x{d.cantidad_usada}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Selector para insumos adicionales */}
                                <div className="flex gap-2">
                                    <select
                                        value={idInsumoSeleccionado}
                                        onChange={(e) => setIdInsumoSeleccionado(e.target.value)}
                                        className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    >
                                        <option value="">+ Insumo adicional...</option>
                                        {insumosDisponibles.map((insumo, idx) => (
                                            <option key={insumo.id_insumo ?? `insumo-opt-${idx}`} value={insumo.id_insumo}>
                                                {insumo.nombre} (Stock: {insumo.stock_actual ?? 0})
                                            </option>
                                        ))}
                                    </select>
                                    <input
                                        type="number"
                                        value={cantidadInsumo}
                                        onChange={(e) => setCantidadInsumo(e.target.value)}
                                        className="w-20 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                        min="0.001"
                                        step="0.001"
                                        placeholder="Cant."
                                    />
                                    <button
                                        type="button"
                                        onClick={agregarInsumo}
                                        className="bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold px-4 py-2 rounded-lg text-sm transition"
                                    >
                                        +
                                    </button>
                                </div>

                                {insumosSeleccionados.length > 0 && (
                                    <div className="mt-3 space-y-1">
                                        {insumosSeleccionados.map((item) => (
                                            <div
                                                key={item._key}
                                                className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2 text-sm"
                                            >
                                                <span className="font-medium text-blue-900">
                                                    {item.nombre}
                                                    <span className="ml-2 text-blue-600 text-xs">× {item.cantidad}</span>
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => quitarInsumo(item._key)}
                                                    className="text-red-400 hover:text-red-600 transition font-bold text-base leading-none"
                                                    title="Quitar"
                                                >
                                                    &times;
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        </div>

                        {/* Footer */}
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
                                    "Guardar Comprobante"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
