"use client";

import { useState, useEffect } from "react";
import { registrarCobro, obtenerFacturasPendientesCliente } from "@/actions/cobros";
import { imprimirRecibo } from "@/components/BotonImprimirRecibo";
import { distribuirCobro } from "@/lib/cobros";

interface Cliente {
    id_cliente: number;
    nombre: string;
    apellido: string;
}

interface FacturaPendiente {
    id_factura: number;
    num_factura: string | null;
    tipo: string | null;
    fecha_emision: string;
    monto_total: number;
    saldo_pendiente: number;
    estado_pago: string;
}

interface Props {
    clientes: Cliente[];
}

const inputCls =
    "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400";

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(amount);
}

export default function ModalCobro({ clientes }: Props) {
    const [abierto, setAbierto] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Se muestra junto al botón: el modal ya se cerró cuando falla la impresión.
    const [errorImpresion, setErrorImpresion] = useState<string | null>(null);

    const [idCliente, setIdCliente] = useState("");
    const [observacion, setObservacion] = useState("");
    const [fechaPago, setFechaPago] = useState("");

    const [facturasPendientes, setFacturasPendientes] = useState<FacturaPendiente[]>([]);
    const [montoEntregado, setMontoEntregado] = useState("");
    const [imputaciones, setImputaciones] = useState<Record<number, string>>({});

    // Medios de pago que componen el cobro (ej. una parte en efectivo y otra
    // por transferencia). Cada uno con su propio monto; la suma tiene que
    // coincidir con lo imputado menos las retenciones.
    const [medios, setMedios] = useState<{ _key: string; forma_pago: string; monto: string }[]>([]);
    const [nuevoMedioPago, setNuevoMedioPago] = useState("Efectivo");
    const [nuevoMedioMonto, setNuevoMedioMonto] = useState("");

    const [mostrarRetenciones, setMostrarRetenciones] = useState(false);
    const [retenciones, setRetenciones] = useState<Record<string, string>>({
        IVA: "",
        GANANCIAS: "",
        IIBB: "",
        SUSS: "",
    });

    useEffect(() => {
        if (idCliente) {
            obtenerFacturasPendientesCliente(Number(idCliente)).then((data: FacturaPendiente[]) => {
                setFacturasPendientes(data);
                setImputaciones({});
            });
        } else {
            setFacturasPendientes([]);
            setImputaciones({});
        }
    }, [idCliente]);

    function distribuirMontoEntregado() {
        const monto = parseFloat(montoEntregado) || 0;
        setImputaciones(distribuirCobro(facturasPendientes, monto));
    }

    function actualizarImputacion(id_factura: number, valor: string) {
        setImputaciones((prev) => ({ ...prev, [id_factura]: valor }));
    }

    const totalImputado = Object.values(imputaciones).reduce((acc, v) => acc + (parseFloat(v) || 0), 0);
    const totalRetenido = Object.values(retenciones).reduce((acc, v) => acc + (parseFloat(v) || 0), 0);
    // Lo que realmente entra en mano/banco: lo imputado menos lo retenido.
    const totalARepartirEnMedios = Math.max(0, totalImputado - totalRetenido);
    const totalEnMedios = medios.reduce((acc, m) => acc + (parseFloat(m.monto) || 0), 0);
    const diferenciaMedios = totalARepartirEnMedios - totalEnMedios;

    function agregarMedioDePago() {
        const monto = parseFloat(nuevoMedioMonto);
        if (!monto || monto <= 0) {
            setError("Indicá un monto mayor a cero para el medio de pago.");
            return;
        }
        setMedios((prev) => [
            ...prev,
            { _key: `${Date.now()}-${Math.random()}`, forma_pago: nuevoMedioPago, monto: monto.toFixed(2) },
        ]);
        setNuevoMedioMonto("");
        setError(null);
    }

    function completarMedioConRestante() {
        const restante = Math.max(0, diferenciaMedios);
        setNuevoMedioMonto(restante > 0 ? restante.toFixed(2) : "");
    }

    function quitarMedioDePago(key: string) {
        setMedios((prev) => prev.filter((m) => m._key !== key));
    }

    function resetForm() {
        setIdCliente("");
        setObservacion("");
        setFechaPago("");
        setFacturasPendientes([]);
        setMontoEntregado("");
        setImputaciones({});
        setMedios([]);
        setNuevoMedioPago("Efectivo");
        setNuevoMedioMonto("");
        setMostrarRetenciones(false);
        setRetenciones({ IVA: "", GANANCIAS: "", IIBB: "", SUSS: "" });
        setError(null);
    }

    function actualizarRetencion(tipo: string, valor: string) {
        setRetenciones((prev) => ({ ...prev, [tipo]: valor }));
    }

    async function handleGuardar() {
        const lineas = Object.entries(imputaciones)
            .map(([id_factura, monto]) => ({ id_factura: Number(id_factura), monto: parseFloat(monto) || 0 }))
            .filter((l) => l.monto > 0);

        if (!idCliente) {
            setError("Elegí un cliente.");
            return;
        }
        if (medios.length === 0) {
            setError("Agregá al menos un medio de pago.");
            return;
        }
        if (lineas.length === 0) {
            setError("Cargá algún monto a imputar en al menos una factura.");
            return;
        }
        if (Math.abs(diferenciaMedios) > 0.01) {
            setError(
                diferenciaMedios > 0
                    ? `Faltan ${formatCurrency(diferenciaMedios)} por repartir entre los medios de pago.`
                    : `Los medios de pago suman ${formatCurrency(-diferenciaMedios)} de más.`
            );
            return;
        }

        const lineasRetenciones = Object.entries(retenciones)
            .map(([tipo, monto]) => ({ tipo, monto: parseFloat(monto) || 0 }))
            .filter((r) => r.monto > 0);

        setCargando(true);
        setError(null);

        const resultado = await registrarCobro({
            id_cliente: Number(idCliente),
            formasPago: medios.map((m) => ({ forma_pago: m.forma_pago, monto: parseFloat(m.monto) || 0 })),
            observacion: observacion || undefined,
            fecha_pago: fechaPago ? new Date(fechaPago) : undefined,
            imputaciones: lineas,
            retenciones: lineasRetenciones.length > 0 ? lineasRetenciones : undefined,
        });

        setCargando(false);

        if (resultado.success) {
            setAbierto(false);
            resetForm();

            // Imprimir siempre el recibo del cobro que se acaba de registrar,
            // nunca la factura imputada (esa se imprime aparte desde
            // Comprobantes si hace falta).
            if (resultado.recibo?.id_recibo) {
                const idRecibo = resultado.recibo.id_recibo;
                const ok = await imprimirRecibo(idRecibo);
                if (!ok) {
                    setErrorImpresion(`El cobro se registró, pero no se pudo imprimir el recibo #${idRecibo}. Podés imprimirlo desde la lista de cobros.`);
                }
            }
        } else {
            setError(resultado.error || "Error al registrar el cobro.");
        }
    }

    return (
        <>
            <span className="inline-flex items-center gap-3">
                {errorImpresion && (
                    <span role="alert" className="text-sm text-red-600 font-medium">
                        {errorImpresion}
                    </span>
                )}
                <button
                    onClick={() => { resetForm(); setErrorImpresion(null); setAbierto(true); }}
                    className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 transition font-medium"
                >
                    + Registrar Cobro
                </button>
            </span>

            {abierto && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-stretch md:items-center z-[9999] p-0 md:p-4">
                    <div className="bg-white md:rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col text-gray-800 overflow-hidden md:max-h-[calc(100vh-2rem)]">

                        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-green-600 to-green-700 text-white md:rounded-t-2xl shrink-0">
                            <div>
                                <h3 className="text-lg font-bold tracking-wide">Registrar Cobro</h3>
                                <p className="text-green-100 text-xs mt-0.5">
                                    Imputá un pago a una o varias facturas del cliente.
                                </p>
                            </div>
                            <button
                                onClick={() => setAbierto(false)}
                                className="text-white/70 hover:text-white text-2xl leading-none transition"
                            >
                                &times;
                            </button>
                        </div>

                        <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1 min-h-0">

                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2">
                                    {error}
                                </div>
                            )}

                            <section>
                                <h4 className="text-xs font-bold uppercase tracking-widest text-green-600 mb-3 border-b pb-1">
                                    Cliente
                                </h4>
                                <select
                                    value={idCliente}
                                    onChange={(e) => setIdCliente(e.target.value)}
                                    className={inputCls}
                                >
                                    <option value="">Seleccioná un cliente...</option>
                                    {clientes.map((c) => (
                                        <option key={c.id_cliente} value={c.id_cliente}>
                                            {c.apellido}, {c.nombre}
                                        </option>
                                    ))}
                                </select>
                            </section>

                            {idCliente && (
                                <section>
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-green-600 mb-3 border-b pb-1">
                                        Datos del Cobro
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Fecha (Opcional)</label>
                                            <input
                                                type="date"
                                                value={fechaPago}
                                                onChange={(e) => setFechaPago(e.target.value)}
                                                className={inputCls}
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Observación</label>
                                            <input
                                                type="text"
                                                value={observacion}
                                                onChange={(e) => setObservacion(e.target.value)}
                                                className={inputCls}
                                            />
                                        </div>
                                    </div>
                                </section>
                            )}

                            {idCliente && (
                                <section>
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-green-600 mb-3 border-b pb-1">
                                        Facturas Pendientes
                                    </h4>

                                    {facturasPendientes.length === 0 ? (
                                        <p className="text-sm text-gray-500">Este cliente no tiene facturas pendientes.</p>
                                    ) : (
                                        <>
                                            <div className="space-y-2">
                                                {facturasPendientes.map((f) => (
                                                    <div
                                                        key={f.id_factura}
                                                        className="flex items-center justify-between bg-gray-50 border rounded-lg px-3 py-2 text-sm gap-3"
                                                    >
                                                        <div className="flex-1">
                                                            <div className="font-semibold text-gray-800">
                                                                {f.num_factura || `Factura #${f.id_factura}`}
                                                                <span className="ml-2 text-xs font-normal text-gray-400">
                                                                    {new Date(f.fecha_emision).toLocaleDateString("es-AR", { timeZone: "UTC" })}
                                                                </span>
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                Total {formatCurrency(Number(f.monto_total))} · Saldo {formatCurrency(Number(f.saldo_pendiente))}
                                                            </div>
                                                        </div>
                                                        <div className="relative w-32">
                                                            <span className="absolute left-3 top-2 text-gray-400 text-xs">$</span>
                                                            <input
                                                                type="number"
                                                                value={imputaciones[f.id_factura] ?? ""}
                                                                onChange={(e) => actualizarImputacion(f.id_factura, e.target.value)}
                                                                placeholder="0.00"
                                                                min="0"
                                                                step="0.01"
                                                                className="w-full border rounded-lg pl-6 pr-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="mt-3 flex justify-end text-sm font-bold text-gray-700">
                                                Total a cobrar: {formatCurrency(totalImputado)}
                                            </div>
                                        </>
                                    )}
                                </section>
                            )}

                            {idCliente && (
                                <section>
                                    <button
                                        type="button"
                                        onClick={() => setMostrarRetenciones((v) => !v)}
                                        className="text-xs font-bold uppercase tracking-widest text-green-600 mb-3 border-b pb-1 w-full text-left flex items-center justify-between"
                                    >
                                        <span>¿Te retuvieron algo de este pago?</span>
                                        <span className="text-gray-400 normal-case font-normal">{mostrarRetenciones ? "Ocultar" : "Mostrar"}</span>
                                    </button>

                                    {mostrarRetenciones && (
                                        <div className="space-y-2">
                                            {[
                                                { tipo: "IVA", label: "IVA" },
                                                { tipo: "GANANCIAS", label: "Ganancias" },
                                                { tipo: "IIBB", label: "Ingresos Brutos" },
                                                { tipo: "SUSS", label: "SUSS" },
                                            ].map((r) => (
                                                <div key={r.tipo} className="flex items-center justify-between bg-gray-50 border rounded-lg px-3 py-2 text-sm gap-3">
                                                    <span className="font-medium text-gray-700">{r.label}</span>
                                                    <div className="relative w-32">
                                                        <span className="absolute left-3 top-2 text-gray-400 text-xs">$</span>
                                                        <input
                                                            type="number"
                                                            value={retenciones[r.tipo]}
                                                            onChange={(e) => actualizarRetencion(r.tipo, e.target.value)}
                                                            placeholder="0.00"
                                                            min="0"
                                                            step="0.01"
                                                            className="w-full border rounded-lg pl-6 pr-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </section>
                            )}

                            {idCliente && (
                                <section>
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-green-600 mb-3 border-b pb-1">
                                        Medios de Pago
                                        <span className="ml-2 text-[10px] font-normal normal-case tracking-normal text-gray-400">
                                            (se puede combinar, ej. una parte en efectivo y otra por transferencia)
                                        </span>
                                    </h4>

                                    {facturasPendientes.length > 0 && (
                                        <div className="mb-3">
                                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                                Monto entregado (se reparte de la factura más vieja a la más nueva)
                                            </label>
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <span className="absolute left-3 top-2 text-gray-400 text-sm">$</span>
                                                    <input
                                                        type="number"
                                                        value={montoEntregado}
                                                        onChange={(e) => setMontoEntregado(e.target.value)}
                                                        placeholder="Monto entregado"
                                                        min="0"
                                                        step="0.01"
                                                        className="w-full border rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={distribuirMontoEntregado}
                                                    className="bg-green-50 text-green-700 hover:bg-green-100 font-semibold px-4 py-2 rounded-lg text-sm transition whitespace-nowrap"
                                                >
                                                    Repartir
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {medios.length > 0 && (
                                        <div className="space-y-1 mb-3">
                                            {medios.map((m) => (
                                                <div
                                                    key={m._key}
                                                    className="flex items-center justify-between bg-green-50 border border-green-100 rounded-lg px-3 py-2 text-sm"
                                                >
                                                    <span className="font-medium text-green-900">{m.forma_pago}</span>
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-bold text-gray-800">{formatCurrency(parseFloat(m.monto) || 0)}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => quitarMedioDePago(m._key)}
                                                            className="text-red-400 hover:text-red-600 transition font-bold text-base leading-none"
                                                            title="Quitar"
                                                        >
                                                            &times;
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex gap-2">
                                        <select
                                            value={nuevoMedioPago}
                                            onChange={(e) => setNuevoMedioPago(e.target.value)}
                                            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
                                        >
                                            <option value="Efectivo">Efectivo</option>
                                            <option value="Transferencia">Transferencia</option>
                                            <option value="Tarjeta de débito">Tarjeta de débito</option>
                                            <option value="Tarjeta de crédito">Tarjeta de crédito</option>
                                            <option value="Cheque">Cheque</option>
                                            <option value="Otro">Otro</option>
                                        </select>
                                        <div className="relative w-32">
                                            <span className="absolute left-3 top-2 text-gray-400 text-xs">$</span>
                                            <input
                                                type="number"
                                                value={nuevoMedioMonto}
                                                onChange={(e) => setNuevoMedioMonto(e.target.value)}
                                                placeholder="0.00"
                                                min="0"
                                                step="0.01"
                                                className="w-full border rounded-lg pl-6 pr-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={agregarMedioDePago}
                                            className="bg-green-50 text-green-700 hover:bg-green-100 font-bold px-4 py-2 rounded-lg text-sm transition"
                                        >
                                            +
                                        </button>
                                    </div>

                                    {totalARepartirEnMedios > 0 && (
                                        <div className="mt-2 flex items-center justify-between text-xs">
                                            <span className={Math.abs(diferenciaMedios) > 0.01 ? "text-amber-600 font-semibold" : "text-green-600 font-semibold"}>
                                                {Math.abs(diferenciaMedios) <= 0.01
                                                    ? "Medios de pago completos"
                                                    : diferenciaMedios > 0
                                                    ? `Falta repartir ${formatCurrency(diferenciaMedios)}`
                                                    : `Sobran ${formatCurrency(-diferenciaMedios)}`}
                                            </span>
                                            {diferenciaMedios > 0.01 && (
                                                <button
                                                    type="button"
                                                    onClick={completarMedioConRestante}
                                                    className="text-green-700 hover:underline font-semibold"
                                                >
                                                    Completar con el resto
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </section>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 md:rounded-b-2xl shrink-0">
                            <button
                                onClick={() => setAbierto(false)}
                                className="px-5 py-2 text-sm border rounded-lg text-gray-600 hover:bg-gray-100 font-medium transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleGuardar}
                                disabled={cargando}
                                className="px-5 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {cargando ? (
                                    <>
                                        <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                                        Guardando...
                                    </>
                                ) : (
                                    "Registrar Cobro"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
