"use client";

import { useState, useEffect } from "react";
import { crearFactura } from "@/actions/facturacion";
import { obtenerInsumos } from "@/actions/insumos";
import { obtenerInsumosDeOrden, obtenerServiciosDeOrden } from "@/actions/ordenes";
import { esTipoFacturable } from "@/lib/estadoFactura";
import { calcularImportes } from "@/lib/comprobantes";

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
    const [neto, setNeto] = useState("");
    const [netoTocado, setNetoTocado] = useState(false);
    const [alicuotaIva, setAlicuotaIva] = useState("21");
    const [fechaVencimiento, setFechaVencimiento] = useState("");
    const [descripcion, setDescripcion] = useState("");

    const [tipoDescuento, setTipoDescuento] = useState("");
    const [descuentoPorcentaje, setDescuentoPorcentaje] = useState("");
    const [descuentoImporte, setDescuentoImporte] = useState("");
    const [equipoDescripcion, setEquipoDescripcion] = useState("");

    const facturable = esTipoFacturable(tipo);
    const mostrarPrecios = facturable;
    const mostrarInsumosYDescuento = facturable;

    const netoBrutoNum = neto ? parseFloat(neto) : 0;

    // Preview en vivo: mientras el usuario está tipeando, el descuento puede
    // estar incompleto (ej. tipo "PORCENTAJE" elegido pero el % todavía vacío).
    // calcularImportes tira error en esos casos porque son inválidos para
    // guardar la factura, pero acá solo queremos mostrar 0 de descuento.
    let descuentoMontoNum = 0;
    let netoGravadoNum = netoBrutoNum;
    let montoTotalCalculado = netoBrutoNum + netoBrutoNum * (parseFloat(alicuotaIva || "0") / 100);
    try {
        const importes = calcularImportes({
            neto: netoBrutoNum,
            alicuotaIva: parseFloat(alicuotaIva || "0"),
            tipoDescuento: tipoDescuento === "PORCENTAJE" || tipoDescuento === "EQUIPO" ? tipoDescuento : null,
            descuentoPorcentaje: descuentoPorcentaje ? parseFloat(descuentoPorcentaje) : null,
            descuentoMontoEquipo: descuentoImporte ? parseFloat(descuentoImporte) : null,
            equipoDescripcion,
            facturable: true,
        });
        descuentoMontoNum = importes.descuentoMonto ?? 0;
        netoGravadoNum = importes.netoGravado;
        montoTotalCalculado = importes.montoTotal;
    } catch {
        // input incompleto/invalido todavia: se mantiene el preview sin descuento
    }
    const montoIva = montoTotalCalculado - netoGravadoNum;

    /* Insumos */
    const [insumosDisponibles, setInsumosDisponibles] = useState<Insumo[]>([]);
    const [insumosSeleccionados, setInsumosSeleccionados] = useState<
        { _key: string; id_insumo: number; nombre: string; cantidad: number }[]
    >([]);
    const [idInsumoSeleccionado, setIdInsumoSeleccionado] = useState("");
    const [cantidadInsumo, setCantidadInsumo] = useState("1");

    /* Insumos ya registrados en la orden (pre-cargados) */
    const [insumosDeOrden, setInsumosDeOrden] = useState<
        { id_detalle_ins?: number; id_detalle_ord_insumo?: number; cantidad_usada: number; precio_aplicado: number | string; insumo: { nombre: string } | null }[]
    >([]);

    /* Servicios ya registrados en la orden (para sugerir el subtotal) */
    const [serviciosDeOrden, setServiciosDeOrden] = useState<
        { cantidad: number; precio_acordado: number | string }[]
    >([]);

    /* Abrir con orden preseleccionada desde URL */
    useEffect(() => {
        if (openWithOrdenId) {
            setIdOrden(openWithOrdenId);
            setLetraNumero(`A-${openWithOrdenId.padStart(4, "0")}`);
            setAbierto(true);
        }
    }, [openWithOrdenId]);

    /* Cargar insumos al abrir */
    useEffect(() => {
        if (abierto) {
            obtenerInsumos().then((data) => setInsumosDisponibles(data as Insumo[]));
        }
    }, [abierto]);

    /* Cargar servicios e insumos de la orden al seleccionarla */
    useEffect(() => {
        setNetoTocado(false);
        if (idOrden) {
            obtenerInsumosDeOrden(Number(idOrden)).then((data: any) => setInsumosDeOrden(data));
            obtenerServiciosDeOrden(Number(idOrden)).then((data: any) => setServiciosDeOrden(data));
        } else {
            setInsumosDeOrden([]);
            setServiciosDeOrden([]);
        }
    }, [idOrden]);

    /* Sugerir el subtotal como suma de servicios + insumos de la orden (más los
       insumos adicionales que se vayan agregando), mientras el usuario no haya
       tocado el campo a mano */
    useEffect(() => {
        if (!facturable || netoTocado) return;

        const totalServicios = serviciosDeOrden.reduce(
            (acc, s) => acc + (s.cantidad || 1) * parseFloat(String(s.precio_acordado)),
            0
        );
        const totalInsumosOrden = insumosDeOrden.reduce(
            (acc, d) => acc + (d.cantidad_usada || 1) * parseFloat(String(d.precio_aplicado)),
            0
        );
        const totalInsumosAdicionales = insumosSeleccionados.reduce((acc, item) => {
            const insumo = insumosDisponibles.find((i) => i.id_insumo === item.id_insumo);
            return acc + item.cantidad * (insumo?.precio_venta ?? 0);
        }, 0);

        const sugerido = totalServicios + totalInsumosOrden + totalInsumosAdicionales;
        setNeto(sugerido > 0 ? sugerido.toFixed(2) : "");
    }, [facturable, netoTocado, serviciosDeOrden, insumosDeOrden, insumosSeleccionados, insumosDisponibles]);

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
        setNeto("");
        setNetoTocado(false);
        setAlicuotaIva("21");
        setFechaVencimiento("");
        setDescripcion("");
        setInsumosSeleccionados([]);
        setInsumosDeOrden([]);
        setServiciosDeOrden([]);
        setTipoDescuento("");
        setDescuentoPorcentaje("");
        setDescuentoImporte("");
        setEquipoDescripcion("");
        setError(null);
    }

    async function handleGuardar() {
        if (!idOrden || !tipo) {
            setError("Completá la Orden y el Tipo antes de guardar.");
            return;
        }
        if (mostrarPrecios && !neto) {
            setError("Completá el Subtotal antes de guardar.");
            return;
        }

        if (mostrarInsumosYDescuento && tipoDescuento === "PORCENTAJE") {
            const pct = parseFloat(descuentoPorcentaje);
            if (!descuentoPorcentaje || isNaN(pct) || pct < 0 || pct > 100) {
                setError("El porcentaje de descuento debe estar entre 0 y 100.");
                return;
            }
        }
        if (mostrarInsumosYDescuento && tipoDescuento === "EQUIPO") {
            if (!equipoDescripcion.trim()) {
                setError("Indicá qué equipo entrega el cliente en parte de pago.");
                return;
            }
            const imp = parseFloat(descuentoImporte);
            if (!descuentoImporte || isNaN(imp) || imp <= 0) {
                setError("El importe del equipo debe ser mayor a cero.");
                return;
            }
            if (imp >= parseFloat(neto)) {
                setError("El descuento no puede igualar o superar el subtotal.");
                return;
            }
        }

        setCargando(true);
        setError(null);

        const descuentoActivo = mostrarInsumosYDescuento ? tipoDescuento : "";

        const resultado = await crearFactura({
            id_orden: Number(idOrden),
            tipo,
            num_factura: `${tipo} ${letraNumero}`.trim(),
            neto: mostrarPrecios ? parseFloat(neto) : 0,
            alicuota_iva: mostrarPrecios ? parseFloat(alicuotaIva || "0") : 0,
            fecha_vencimiento: fechaVencimiento ? new Date(fechaVencimiento) : undefined,
            descripcion: descripcion || undefined,
            insumos: mostrarInsumosYDescuento
                ? insumosSeleccionados.map((i) => ({
                    id_insumo: i.id_insumo,
                    cantidad: i.cantidad,
                }))
                : [],
            tipo_descuento: descuentoActivo ? (descuentoActivo as "PORCENTAJE" | "EQUIPO") : null,
            descuento_porcentaje: descuentoActivo === "PORCENTAJE" ? parseFloat(descuentoPorcentaje) : null,
            descuento_monto_equipo: descuentoActivo === "EQUIPO" ? parseFloat(descuentoImporte) : null,
            equipo_descripcion: descuentoActivo === "EQUIPO" ? equipoDescripcion.trim() : null,
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
                                    Generá una factura o remito. Recibos, presupuestos e informes técnicos tienen su propio flujo.
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
                                            <option value="Remito">Remito</option>
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
                                    {mostrarPrecios && (
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                                Subtotal *
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-2 text-gray-400 text-sm">$</span>
                                                <input
                                                    type="number"
                                                    value={neto}
                                                    onChange={(e) => { setNeto(e.target.value); setNetoTocado(true); }}
                                                    placeholder="0.00"
                                                    className="w-full border rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                />
                                            </div>
                                        </div>
                                    )}
                                    {mostrarPrecios && (
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                                Alícuota IVA (%)
                                            </label>
                                            <input
                                                type="number"
                                                value={alicuotaIva}
                                                onChange={(e) => setAlicuotaIva(e.target.value)}
                                                className={inputCls}
                                            />
                                        </div>
                                    )}
                                    {mostrarPrecios && (
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
                                    )}
                                    {mostrarPrecios && neto && (
                                        <div className="col-span-2 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-xs space-y-1.5">
                                            <div className="flex justify-between text-blue-700">
                                                <span>Subtotal</span>
                                                <span>${netoBrutoNum.toFixed(2)}</span>
                                            </div>
                                            {tipoDescuento && descuentoMontoNum > 0 && (
                                                <div className="flex justify-between text-orange-700">
                                                    <span>
                                                        {tipoDescuento === "PORCENTAJE"
                                                            ? `Bonificacion ${descuentoPorcentaje}%`
                                                            : "Equipo en parte de pago"}
                                                    </span>
                                                    <span>- ${descuentoMontoNum.toFixed(2)}</span>
                                                </div>
                                            )}
                                            {tipoDescuento && descuentoMontoNum > 0 && (
                                                <div className="flex justify-between text-blue-700 border-t border-blue-200 pt-1">
                                                    <span>Neto gravado</span>
                                                    <span>${netoGravadoNum.toFixed(2)}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between text-blue-700">
                                                <span>IVA {alicuotaIva}%</span>
                                                <span>${montoIva.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between font-bold text-blue-800 border-t border-blue-200 pt-1">
                                                <span>Total</span>
                                                <span>${montoTotalCalculado.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    )}
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

                            {/* ── Descuento ── */}
                            {mostrarInsumosYDescuento && (
                            <section>
                                <h4 className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3 border-b pb-1">
                                    Descuento
                                </h4>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">
                                        Tipo de descuento
                                    </label>
                                    <select
                                        value={tipoDescuento}
                                        onChange={(e) => {
                                            setTipoDescuento(e.target.value);
                                            setDescuentoPorcentaje("");
                                            setDescuentoImporte("");
                                            setEquipoDescripcion("");
                                        }}
                                        className={inputCls}
                                    >
                                        <option value="">Sin descuento</option>
                                        <option value="PORCENTAJE">Porcentaje</option>
                                        <option value="EQUIPO">Equipo en parte de pago</option>
                                    </select>
                                </div>

                                {tipoDescuento === "PORCENTAJE" && (
                                    <div className="mt-3">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">
                                            Porcentaje (%)
                                        </label>
                                        <input
                                            type="number"
                                            value={descuentoPorcentaje}
                                            onChange={(e) => setDescuentoPorcentaje(e.target.value)}
                                            min="0"
                                            max="100"
                                            step="0.01"
                                            placeholder="Ej: 10"
                                            className={inputCls}
                                        />
                                    </div>
                                )}

                                {tipoDescuento === "EQUIPO" && (
                                    <div className="mt-3 space-y-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                                Descripcion del equipo *
                                            </label>
                                            <input
                                                type="text"
                                                value={equipoDescripcion}
                                                onChange={(e) => setEquipoDescripcion(e.target.value)}
                                                placeholder="Ej: Split Surrey 3000 frigorias, funcionando"
                                                className={inputCls}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                                Importe a descontar *
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-2 text-gray-400 text-sm">$</span>
                                                <input
                                                    type="number"
                                                    value={descuentoImporte}
                                                    onChange={(e) => setDescuentoImporte(e.target.value)}
                                                    placeholder="0.00"
                                                    min="0"
                                                    step="0.01"
                                                    className="w-full border rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </section>
                            )}

                            {/* ── Insumos ── */}
                            {mostrarInsumosYDescuento && (
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
                            )}
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
