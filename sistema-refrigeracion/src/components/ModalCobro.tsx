"use client";

import { useState, useEffect } from "react";
import { registrarCobro, obtenerComprobantesPendientesCliente } from "@/actions/cobros";
import { imprimirRecibo } from "@/components/BotonImprimirRecibo";
import { distribuirCobro } from "@/lib/cobros";
import {
    calcularRetencion,
    parsearPorcentaje,
    porcentajeValido,
    ratioIvaDeComprobante,
} from "@/lib/retenciones";

interface Cliente {
    id_cliente: number;
    nombre: string;
    apellido: string;
}

interface ComprobantePendiente {
    id_comprobante: number;
    num_comprobante: string | null;
    tipo: string | null;
    fecha_emision: string;
    monto_total: number;
    saldo_pendiente: number;
    estado_pago: string;
    alicuota_iva?: number | string | null;
    comprobante_iva?: { alicuota: number | string; monto_iva: number | string }[];
}

const TIPOS_RETENCION = [
    { tipo: "IVA", label: "IVA" },
    { tipo: "GANANCIAS", label: "Ganancias" },
    { tipo: "IIBB", label: "Ingresos Brutos" },
    { tipo: "SUSS", label: "SUSS" },
];

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

    const [comprobantesPendientes, setComprobantesPendientes] = useState<ComprobantePendiente[]>([]);
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
    // Porcentaje escrito por el usuario (sin valor por defecto) y de dónde viene
    // el monto de cada retención: "pct" = calculado (se recalcula si cambia lo
    // imputado), "manual" = escrito a mano.
    const [retPct, setRetPct] = useState<Record<string, string>>({ IVA: "", GANANCIAS: "", IIBB: "", SUSS: "" });
    const [retModo, setRetModo] = useState<Record<string, "pct" | "manual">>({
        IVA: "manual",
        GANANCIAS: "manual",
        IIBB: "manual",
        SUSS: "manual",
    });

    useEffect(() => {
        if (!idCliente) {
            setComprobantesPendientes([]);
            setImputaciones({});
            return;
        }
        // La action no se puede abortar: si cambia el cliente antes de que
        // responda, se descarta la respuesta vieja para que no pise a la nueva.
        let vigente = true;
        obtenerComprobantesPendientesCliente(Number(idCliente)).then((data: ComprobantePendiente[]) => {
            if (!vigente) return;
            setComprobantesPendientes(data);
            setImputaciones({});
        });
        return () => { vigente = false; };
    }, [idCliente]);

    function distribuirMontoEntregado() {
        const monto = parseFloat(montoEntregado) || 0;
        setImputaciones(distribuirCobro(comprobantesPendientes, monto));
    }

    function actualizarImputacion(id_comprobante: number, valor: string) {
        setImputaciones((prev) => ({ ...prev, [id_comprobante]: valor }));
    }

    const totalImputado = Object.values(imputaciones).reduce((acc, v) => acc + (parseFloat(v) || 0), 0);

    // Base de cada comprobante = lo imputado a él (no el total de la factura)
    const partesImputadas = comprobantesPendientes.map((c) => ({
        imputado: parseFloat(imputaciones[c.id_comprobante] ?? "") || 0,
        ratioIva: ratioIvaDeComprobante(c),
    }));

    // Monto efectivo de cada retención: calculado desde el % o escrito a mano
    const retencionesEfectivas: Record<string, string> = {};
    const pctInvalido: Record<string, boolean> = {};
    for (const { tipo } of TIPOS_RETENCION) {
        const pct = parsearPorcentaje(retPct[tipo] ?? "");
        pctInvalido[tipo] = !porcentajeValido(pct);
        if (retModo[tipo] === "pct") {
            retencionesEfectivas[tipo] =
                pct === null || pctInvalido[tipo] ? "0.00" : calcularRetencion(tipo, partesImputadas, pct).toFixed(2);
        } else {
            retencionesEfectivas[tipo] = retenciones[tipo];
        }
    }
    const totalRetenido = Object.values(retencionesEfectivas).reduce((acc, v) => acc + (parseFloat(v) || 0), 0);
    const retencionesExcedenImputado = totalRetenido > totalImputado + 0.005;
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
        setComprobantesPendientes([]);
        setMontoEntregado("");
        setImputaciones({});
        setMedios([]);
        setNuevoMedioPago("Efectivo");
        setNuevoMedioMonto("");
        setMostrarRetenciones(false);
        setRetenciones({ IVA: "", GANANCIAS: "", IIBB: "", SUSS: "" });
        setRetPct({ IVA: "", GANANCIAS: "", IIBB: "", SUSS: "" });
        setRetModo({ IVA: "manual", GANANCIAS: "manual", IIBB: "manual", SUSS: "manual" });
        setError(null);
    }

    // Monto escrito a mano: deja de recalcularse solo
    function actualizarRetencion(tipo: string, valor: string) {
        setRetenciones((prev) => ({ ...prev, [tipo]: valor }));
        setRetModo((prev) => ({ ...prev, [tipo]: "manual" }));
    }

    // Cambiar el porcentaje completa el monto (y lo mantiene al día con lo imputado)
    function actualizarPorcentaje(tipo: string, valor: string) {
        if (!/^[\d.,]*$/.test(valor)) return;
        setRetPct((prev) => ({ ...prev, [tipo]: valor }));
        setRetModo((prev) => ({ ...prev, [tipo]: "pct" }));
    }

    // Botón "Calcular": vuelve a calcular el monto desde el porcentaje, pisando lo escrito a mano
    function calcularRetencionDesdePorcentaje(tipo: string) {
        setRetModo((prev) => ({ ...prev, [tipo]: "pct" }));
    }

    async function handleGuardar() {
        const lineas = Object.entries(imputaciones)
            .map(([id_comprobante, monto]) => ({ id_comprobante: Number(id_comprobante), monto: parseFloat(monto) || 0 }))
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
            setError("Cargá algún monto a imputar en al menos un comprobante.");
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

        const tipoPctInvalido = TIPOS_RETENCION.find((r) => pctInvalido[r.tipo]);
        if (tipoPctInvalido) {
            setError(`El porcentaje de ${tipoPctInvalido.label} debe estar entre 0 y 100.`);
            return;
        }
        if (retencionesExcedenImputado) {
            setError(
                `Las retenciones (${formatCurrency(totalRetenido)}) no pueden superar lo imputado (${formatCurrency(totalImputado)}).`
            );
            return;
        }

        const lineasRetenciones = Object.entries(retencionesEfectivas)
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
            // nunca el comprobante imputada (esa se imprime aparte desde
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
                                    Imputá un pago a una o varias comprobantes del cliente.
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
                                        Comprobantes Pendientes
                                    </h4>

                                    {comprobantesPendientes.length === 0 ? (
                                        <p className="text-sm text-gray-500">Este cliente no tiene comprobantes pendientes.</p>
                                    ) : (
                                        <>
                                            <div className="space-y-2">
                                                {comprobantesPendientes.map((f) => (
                                                    <div
                                                        key={f.id_comprobante}
                                                        className="flex items-center justify-between bg-gray-50 border rounded-lg px-3 py-2 text-sm gap-3"
                                                    >
                                                        <div className="flex-1">
                                                            <div className="font-semibold text-gray-800">
                                                                {f.num_comprobante || `Comprobante #${f.id_comprobante}`}
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
                                                                value={imputaciones[f.id_comprobante] ?? ""}
                                                                onChange={(e) => actualizarImputacion(f.id_comprobante, e.target.value)}
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
                                            <p className="text-xs text-gray-500">
                                                El porcentaje se aplica sobre lo imputado ({formatCurrency(totalImputado)}) en IVA, y sobre ese importe sin IVA (subtotal neto) en Ganancias, Ingresos Brutos y SUSS.
                                            </p>
                                            {TIPOS_RETENCION.map((r) => (
                                                <div key={r.tipo} className="bg-gray-50 border rounded-lg px-3 py-2 text-sm">
                                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                                        <span className="font-medium text-gray-700 w-32">{r.label}</span>
                                                        <div className="flex items-center gap-2">
                                                            <div className="relative w-20">
                                                                <input
                                                                    type="text"
                                                                    inputMode="decimal"
                                                                    value={retPct[r.tipo]}
                                                                    onChange={(e) => actualizarPorcentaje(r.tipo, e.target.value)}
                                                                    placeholder="0"
                                                                    aria-label={`Porcentaje de retención de ${r.label}`}
                                                                    className={`w-full border rounded-lg pl-2 pr-6 py-1.5 text-sm text-right focus:outline-none focus:ring-2 ${
                                                                        pctInvalido[r.tipo] ? "border-red-400 focus:ring-red-400" : "focus:ring-green-400"
                                                                    }`}
                                                                />
                                                                <span className="absolute right-2 top-1.5 text-gray-400 text-xs">%</span>
                                                            </div>
                                                            <div className="relative w-32">
                                                                <span className="absolute left-3 top-2 text-gray-400 text-xs">$</span>
                                                                <input
                                                                    type="number"
                                                                    value={retencionesEfectivas[r.tipo]}
                                                                    onChange={(e) => actualizarRetencion(r.tipo, e.target.value)}
                                                                    placeholder="0.00"
                                                                    min="0"
                                                                    step="0.01"
                                                                    aria-label={`Monto de retención de ${r.label}`}
                                                                    className="w-full border rounded-lg pl-6 pr-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                                                                />
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => calcularRetencionDesdePorcentaje(r.tipo)}
                                                                className="bg-green-50 text-green-700 hover:bg-green-100 font-semibold px-3 py-1.5 rounded-lg text-xs transition whitespace-nowrap"
                                                            >
                                                                Calcular
                                                            </button>
                                                        </div>
                                                    </div>
                                                    {pctInvalido[r.tipo] && (
                                                        <p className="text-xs text-red-600 mt-1">El porcentaje debe estar entre 0 y 100.</p>
                                                    )}
                                                </div>
                                            ))}
                                            {retencionesExcedenImputado && (
                                                <p className="text-xs text-red-600 font-semibold">
                                                    Las retenciones ({formatCurrency(totalRetenido)}) superan lo imputado ({formatCurrency(totalImputado)}).
                                                </p>
                                            )}
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

                                    {comprobantesPendientes.length > 0 && (
                                        <div className="mb-3">
                                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                                Monto entregado (se reparte del comprobante más vieja a la más nueva)
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
