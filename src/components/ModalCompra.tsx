"use client";

import { useState, useEffect } from "react";
import { crearCompra } from "@/actions/compras";
import { obtenerInsumos } from "@/actions/insumos";

interface Proveedor {
    id_proveedor: number;
    razon_social: string;
    nombre_proveedor: string | null;
}

interface Insumo {
    id_insumo: number;
    nombre: string;
    stock_actual: number | null;
    precio_costo: number;
}

interface Props {
    proveedores: Proveedor[];
}

const inputCls =
    "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";

export default function ModalCompra({ proveedores }: Props) {
    const [abierto, setAbierto] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [idProveedor, setIdProveedor] = useState("");
    const [fechaCompra, setFechaCompra] = useState("");
    const [descripcion, setDescripcion] = useState("");
    const [alicuotaIva, setAlicuotaIva] = useState("21");

    const [insumosDisponibles, setInsumosDisponibles] = useState<Insumo[]>([]);
    const [insumosSeleccionados, setInsumosSeleccionados] = useState<
        { _key: string; id_insumo: number; nombre: string; cantidad: number; precio_unitario: number }[]
    >([]);
    const [idInsumoSeleccionado, setIdInsumoSeleccionado] = useState("");
    const [cantidadInsumo, setCantidadInsumo] = useState("1");
    const [precioUnitarioInsumo, setPrecioUnitarioInsumo] = useState("");

    const netoNum = insumosSeleccionados.reduce((acc, i) => acc + i.cantidad * i.precio_unitario, 0);
    const montoIva = netoNum * (parseFloat(alicuotaIva || "0") / 100);
    const montoTotalCalculado = netoNum + montoIva;

    useEffect(() => {
        if (abierto) {
            obtenerInsumos().then((data) => setInsumosDisponibles(data as Insumo[]));
        }
    }, [abierto]);

    function agregarInsumo() {
        if (!idInsumoSeleccionado) return;
        if (!precioUnitarioInsumo || parseFloat(precioUnitarioInsumo) <= 0) {
            setError("Indicá el precio unitario del insumo antes de agregarlo.");
            return;
        }
        const insumo = insumosDisponibles.find((i) => i.id_insumo === Number(idInsumoSeleccionado));
        if (insumo) {
            setInsumosSeleccionados((prev) => [
                ...prev,
                {
                    _key: `${insumo.id_insumo}-${Date.now()}-${Math.random()}`,
                    id_insumo: insumo.id_insumo,
                    nombre: insumo.nombre,
                    cantidad: Number(cantidadInsumo) || 0,
                    precio_unitario: parseFloat(precioUnitarioInsumo) || 0,
                },
            ]);
            setIdInsumoSeleccionado("");
            setCantidadInsumo("1");
            setPrecioUnitarioInsumo("");
        }
    }

    function quitarInsumo(key: string) {
        setInsumosSeleccionados((prev) => prev.filter((item) => item._key !== key));
    }

    function resetForm() {
        setIdProveedor("");
        setFechaCompra("");
        setDescripcion("");
        setAlicuotaIva("21");
        setInsumosSeleccionados([]);
        setIdInsumoSeleccionado("");
        setCantidadInsumo("1");
        setPrecioUnitarioInsumo("");
        setError(null);
    }

    async function handleGuardar() {
        if (insumosSeleccionados.length === 0) {
            setError("Agregá al menos un insumo a la compra.");
            return;
        }

        setCargando(true);
        setError(null);

        const resultado = await crearCompra({
            id_proveedor: idProveedor ? Number(idProveedor) : undefined,
            fecha_compra: fechaCompra ? new Date(fechaCompra) : undefined,
            descripcion: descripcion || undefined,
            alicuota_iva: parseFloat(alicuotaIva || "0"),
            insumos: insumosSeleccionados.map((i) => ({
                id_insumo: i.id_insumo,
                cantidad: i.cantidad,
                precio_unitario: i.precio_unitario,
            })),
        });

        setCargando(false);

        if (resultado.success) {
            setAbierto(false);
            resetForm();
        } else {
            setError(resultado.error || "Error al registrar la compra.");
        }
    }

    return (
        <>
            <button
                onClick={() => { resetForm(); setAbierto(true); }}
                className="bg-orange-600 text-white px-4 py-2 rounded shadow hover:bg-orange-700 transition font-medium"
            >
                + Nueva Compra
            </button>

            {abierto && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-[9999] p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col text-gray-800 overflow-hidden" style={{ maxHeight: 'calc(100vh - 2rem)' }}>

                        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-t-2xl">
                            <div>
                                <h3 className="text-lg font-bold tracking-wide">Nueva Compra</h3>
                                <p className="text-orange-100 text-xs mt-0.5">
                                    Registrá una compra a proveedor. El stock de los insumos se actualiza al guardar.
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
                                <h4 className="text-xs font-bold uppercase tracking-widest text-orange-600 mb-3 border-b pb-1">
                                    Datos de la Compra
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Proveedor</label>
                                        <select
                                            value={idProveedor}
                                            onChange={(e) => setIdProveedor(e.target.value)}
                                            className={inputCls}
                                        >
                                            <option value="">Sin especificar...</option>
                                            {proveedores.map((p) => (
                                                <option key={p.id_proveedor} value={p.id_proveedor}>
                                                    {p.razon_social || p.nombre_proveedor}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Fecha (Opcional)</label>
                                        <input
                                            type="date"
                                            value={fechaCompra}
                                            onChange={(e) => setFechaCompra(e.target.value)}
                                            className={inputCls}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Alícuota IVA (%)</label>
                                        <input
                                            type="number"
                                            value={alicuotaIva}
                                            onChange={(e) => setAlicuotaIva(e.target.value)}
                                            className={inputCls}
                                        />
                                    </div>
                                    {insumosSeleccionados.length > 0 && (
                                        <div className="col-span-2 bg-orange-50 border border-orange-100 rounded-lg px-4 py-3 text-xs space-y-1.5">
                                            <div className="flex justify-between text-orange-700">
                                                <span>Neto (suma de insumos)</span>
                                                <span>${netoNum.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-orange-700">
                                                <span>IVA {alicuotaIva}%</span>
                                                <span>${montoIva.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between font-bold text-orange-800 border-t border-orange-200 pt-1">
                                                <span>Total</span>
                                                <span>${montoTotalCalculado.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    )}
                                    <div className="col-span-2">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Descripción / Notas</label>
                                        <textarea
                                            value={descripcion}
                                            onChange={(e) => setDescripcion(e.target.value)}
                                            rows={2}
                                            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                                        />
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h4 className="text-xs font-bold uppercase tracking-widest text-orange-600 mb-3 border-b pb-1">
                                    Insumos Comprados
                                    <span className="ml-2 text-[10px] font-normal normal-case tracking-normal text-gray-400">
                                        (se suman al stock al guardar)
                                    </span>
                                </h4>

                                <div className="flex gap-2 flex-wrap">
                                    <select
                                        value={idInsumoSeleccionado}
                                        onChange={(e) => setIdInsumoSeleccionado(e.target.value)}
                                        className="flex-1 min-w-[140px] border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                                    >
                                        <option value="">+ Insumo...</option>
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
                                        className="w-20 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                                        min="0.001"
                                        step="0.001"
                                        placeholder="Cant."
                                    />
                                    <div className="relative w-28">
                                        <span className="absolute left-3 top-2 text-gray-400 text-xs">$</span>
                                        <input
                                            type="number"
                                            value={precioUnitarioInsumo}
                                            onChange={(e) => setPrecioUnitarioInsumo(e.target.value)}
                                            className="w-full border rounded-lg pl-6 pr-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                                            min="0"
                                            step="0.01"
                                            placeholder="Precio"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={agregarInsumo}
                                        className="bg-orange-50 text-orange-600 hover:bg-orange-100 font-bold px-4 py-2 rounded-lg text-sm transition"
                                    >
                                        +
                                    </button>
                                </div>

                                {insumosSeleccionados.length > 0 && (
                                    <div className="mt-3 space-y-1">
                                        {insumosSeleccionados.map((item) => (
                                            <div
                                                key={item._key}
                                                className="flex items-center justify-between bg-orange-50 rounded-lg px-3 py-2 text-sm"
                                            >
                                                <span className="font-medium text-orange-900">
                                                    {item.nombre} <span className="text-orange-600">x{item.cantidad}</span>
                                                    {item.precio_unitario > 0 && (
                                                        <span className="text-orange-500 text-xs ml-1">
                                                            (${item.precio_unitario.toFixed(2)} c/u)
                                                        </span>
                                                    )}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => quitarInsumo(item._key)}
                                                    className="text-red-500 hover:text-red-700 text-xs font-bold ml-2"
                                                >
                                                    Quitar
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
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
                                className="px-5 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {cargando ? (
                                    <>
                                        <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                                        Guardando...
                                    </>
                                ) : (
                                    "Registrar Compra"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
