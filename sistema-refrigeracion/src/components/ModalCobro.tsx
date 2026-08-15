"use client";

import { useState, useEffect } from "react";
import { registrarCobro, obtenerFacturasPendientesCliente } from "@/actions/cobros";
import { imprimirRecibo } from "@/components/BotonImprimirRecibo";

interface Cliente {
    id_cliente: number;
    nombre: string;
    apellido: string;
}

interface FacturaPendiente {
    id_factura: number;
    num_factura: string | null;
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

const TOLERANCIA = 0.001;

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(amount);
}

export default function ModalCobro({ clientes }: Props) {
    const [abierto, setAbierto] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [idCliente, setIdCliente] = useState("");
    const [formaPago, setFormaPago] = useState("");
    const [observacion, setObservacion] = useState("");
    const [fechaPago, setFechaPago] = useState("");

    const [facturasPendientes, setFacturasPendientes] = useState<FacturaPendiente[]>([]);
    const [montoEntregado, setMontoEntregado] = useState("");
    const [imputaciones, setImputaciones] = useState<Record<number, string>>({});

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
        let restante = parseFloat(montoEntregado) || 0;
        const nuevasImputaciones: Record<number, string> = {};

        for (const factura of facturasPendientes) {
            if (restante <= TOLERANCIA) break;
            const saldo = Number(factura.saldo_pendiente);
            const aplicar = Math.min(saldo, restante);
            if (aplicar > TOLERANCIA) {
                nuevasImputaciones[factura.id_factura] = aplicar.toFixed(2);
                restante -= aplicar;
            }
        }

        setImputaciones(nuevasImputaciones);
    }

    function actualizarImputacion(id_factura: number, valor: string) {
        setImputaciones((prev) => ({ ...prev, [id_factura]: valor }));
    }

    const totalImputado = Object.values(imputaciones).reduce((acc, v) => acc + (parseFloat(v) || 0), 0);

    function resetForm() {
        setIdCliente("");
        setFormaPago("");
        setObservacion("");
        setFechaPago("");
        setFacturasPendientes([]);
        setMontoEntregado("");
        setImputaciones({});
        setError(null);
    }

    async function handleGuardar() {
        const lineas = Object.entries(imputaciones)
            .map(([id_factura, monto]) => ({ id_factura: Number(id_factura), monto: parseFloat(monto) || 0 }))
            .filter((l) => l.monto > 0);

        if (!idCliente) {
            setError("Elegí un cliente.");
            return;
        }
        if (lineas.length === 0) {
            setError("Cargá algún monto a imputar en al menos una factura.");
            return;
        }

        setCargando(true);
        setError(null);

        const resultado = await registrarCobro({
            id_cliente: Number(idCliente),
            forma_pago: formaPago || undefined,
            observacion: observacion || undefined,
            fecha_pago: fechaPago ? new Date(fechaPago) : undefined,
            imputaciones: lineas,
        });

        setCargando(false);

        if (resultado.success) {
            setAbierto(false);
            resetForm();
            if (resultado.recibo?.id_recibo) {
                imprimirRecibo(resultado.recibo.id_recibo);
            }
        } else {
            setError(resultado.error || "Error al registrar el cobro.");
        }
    }

    return (
        <>
            <button
                onClick={() => { resetForm(); setAbierto(true); }}
                className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 transition font-medium"
            >
                + Registrar Cobro
            </button>

            {abierto && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-[9999] p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col text-gray-800 overflow-hidden" style={{ maxHeight: 'calc(100vh - 2rem)' }}>

                        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-2xl">
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

                        <div className="px-6 py-5 space-y-5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>

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
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Forma de Pago</label>
                                            <select
                                                value={formaPago}
                                                onChange={(e) => setFormaPago(e.target.value)}
                                                className={inputCls}
                                            >
                                                <option value="">Seleccioná...</option>
                                                <option value="Efectivo">Efectivo</option>
                                                <option value="Transferencia">Transferencia</option>
                                            </select>
                                        </div>
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
                                            <div className="flex gap-2 mb-3">
                                                <div className="relative flex-1">
                                                    <span className="absolute left-3 top-2 text-gray-400 text-sm">$</span>
                                                    <input
                                                        type="number"
                                                        value={montoEntregado}
                                                        onChange={(e) => setMontoEntregado(e.target.value)}
                                                        placeholder="Monto entregado"
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
                                                                    {new Date(f.fecha_emision).toLocaleDateString("es-AR")}
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
