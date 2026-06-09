"use client";

import { useState } from "react";
import { crearFactura } from "@/actions/facturacion";

interface Cliente {
    id_cliente: number;
    nombre: string;
    apellido: string;
}

interface Orden {
    id_orden: number;
    cliente: Cliente | null;
}

interface Props {
    ordenes: Orden[];
}

export default function ModalFactura({ ordenes }: Props) {
    const [abierto, setAbierto] = useState(false);
    const [cargando, setCargando] = useState(false);
    
    const [idOrden, setIdOrden] = useState("");
    const [tipo, setTipo] = useState("Factura");
    const [letraNumero, setLetraNumero] = useState(""); // Ej: A-0001
    const [montoTotal, setMontoTotal] = useState("");
    const [estadoPago, setEstadoPago] = useState("PENDIENTE");
    const [fechaVencimiento, setFechaVencimiento] = useState("");
    const [descripcion, setDescripcion] = useState("");

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
                <div className="fixed inset-0 bg-slate-900 bg-opacity-60 flex justify-center items-center z-[9999]">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">

                        <div className="flex justify-between items-center border-b pb-3 mb-4">
                            <h3 className="text-xl font-bold text-gray-800">Nuevo Comprobante</h3>
                            <button onClick={() => setAbierto(false)} className="text-gray-400 hover:text-red-500 text-2xl leading-none">
                                &times;
                            </button>
                        </div>

                        <div className="space-y-4 text-black">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Orden de Trabajo Terminada *</label>
                                <select value={idOrden} onChange={(e) => setIdOrden(e.target.value)} className="mt-1 w-full border p-2 rounded focus:border-blue-500 outline-none">
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
                                    <label className="block text-sm font-medium text-gray-700">Tipo de Comprobante *</label>
                                    <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="mt-1 w-full border p-2 rounded focus:border-blue-500 outline-none">
                                        <option value="Factura">Factura</option>
                                        <option value="Presupuesto">Presupuesto</option>
                                        <option value="Remito">Remito</option>
                                        <option value="Recibo">Recibo</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Número (Ej A-0001)</label>
                                    <input 
                                        type="text" 
                                        value={letraNumero} 
                                        onChange={(e) => setLetraNumero(e.target.value)} 
                                        placeholder="A-0001"
                                        className="mt-1 w-full border p-2 rounded focus:border-blue-500 outline-none" 
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Monto Total *</label>
                                    <div className="relative mt-1">
                                        <span className="absolute left-3 top-2 text-gray-500">$</span>
                                        <input 
                                            type="number" 
                                            value={montoTotal} 
                                            onChange={(e) => setMontoTotal(e.target.value)} 
                                            placeholder="0.00"
                                            className="w-full border p-2 pl-7 rounded focus:border-blue-500 outline-none" 
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Estado de Pago *</label>
                                    <select value={estadoPago} onChange={(e) => setEstadoPago(e.target.value)} className="mt-1 w-full border p-2 rounded focus:border-blue-500 outline-none">
                                        <option value="PAGADA">PAGADA</option>
                                        <option value="IMPAGA">IMPAGA</option>
                                        <option value="PENDIENTE">PENDIENTE</option>
                                        <option value="ENTREGADO">ENTREGADO</option>
                                        <option value="ANULADA">ANULADA</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Vencimiento (Opcional)</label>
                                    <input 
                                        type="date" 
                                        value={fechaVencimiento} 
                                        onChange={(e) => setFechaVencimiento(e.target.value)} 
                                        className="mt-1 w-full border p-2 rounded focus:border-blue-500 outline-none" 
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700">Descripción / Notas</label>
                                    <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={2} className="mt-1 w-full border p-2 rounded focus:border-blue-500 outline-none resize-none" />
                                </div>
                            </div>

                        </div>

                        <div className="mt-6 flex justify-end space-x-3">
                            <button onClick={() => setAbierto(false)} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50 font-medium">
                                Cancelar
                            </button>
                            <button onClick={handleGuardar} disabled={cargando} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                                {cargando ? "Guardando..." : "Guardar Comprobante"}
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </>
    );
}
