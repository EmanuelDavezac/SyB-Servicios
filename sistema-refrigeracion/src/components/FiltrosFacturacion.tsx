"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { esTipoFacturable } from "@/lib/estadoFactura";

export default function FiltrosFacturacion() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Leemos los valores actuales de la URL
    const inicialFechaInicio = searchParams.get("fechaInicio") || "";
    const inicialFechaFin = searchParams.get("fechaFin") || "";
    const inicialCliente = searchParams.get("cliente") || "";
    const inicialTipo = searchParams.get("tipo") || "";
    const inicialEstado = searchParams.get("estado") || "";
    const inicialConSaldo = searchParams.get("conSaldo") === "1";

    const [fechaInicio, setFechaInicio] = useState(inicialFechaInicio);
    const [fechaFin, setFechaFin] = useState(inicialFechaFin);
    const [cliente, setCliente] = useState(inicialCliente);
    const [tipo, setTipo] = useState(inicialTipo);
    const [estado, setEstado] = useState(inicialEstado);
    const [conSaldo, setConSaldo] = useState(inicialConSaldo);

    // "Recibo" no es un tipo facturable (ni siquiera es un tipo de `factura`,
    // vive en su propia tabla): el estado de pago no le aplica en ninguno de
    // los dos casos, así que el select de Estado se deshabilita igual.
    const estadoAplica = tipo === "" || esTipoFacturable(tipo);

    useEffect(() => {
        if (!estadoAplica && estado) setEstado("");
    }, [estadoAplica, estado]);

    useEffect(() => {
        const timer = setTimeout(() => {
            const params = new URLSearchParams();
            if (fechaInicio) params.set("fechaInicio", fechaInicio);
            if (fechaFin) params.set("fechaFin", fechaFin);
            if (cliente.trim()) params.set("cliente", cliente.trim());
            if (tipo) params.set("tipo", tipo);
            if (estadoAplica && estado) params.set("estado", estado);
            if (conSaldo) params.set("conSaldo", "1");

            const newQueryString = params.toString();

            if (newQueryString !== searchParams.toString()) {
                router.push(`/facturacion?${newQueryString}`);
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [fechaInicio, fechaFin, cliente, tipo, estado, estadoAplica, conSaldo, router, searchParams]);

    return (
        <div className="bg-white p-4 rounded shadow mb-6 flex gap-4 text-black items-center">
            <input
                type="date"
                title="Fecha Inicio"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="border p-2 rounded w-1/5 outline-none focus:border-blue-500 text-sm text-gray-600"
            />
            
            <input
                type="date"
                title="Fecha Fin"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="border p-2 rounded w-1/5 outline-none focus:border-blue-500 text-sm text-gray-600"
            />
            
            <input
                type="text"
                placeholder="Cliente..."
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                className="border p-2 rounded flex-1 outline-none focus:border-blue-500"
            />

            <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="border p-2 rounded w-1/5 outline-none focus:border-blue-500"
            >
                <option value="">Todos los Comprobantes</option>
                <option value="Factura">Factura</option>
                <option value="Remito">Remito</option>
                <option value="Recibo">Recibo</option>
            </select>

            <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                disabled={!estadoAplica}
                title={estadoAplica ? undefined : "No aplica para este tipo de comprobante"}
                className="border p-2 rounded w-1/4 outline-none focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
                <option value="">Todos los Estados</option>
                <option value="IMPAGA">IMPAGA</option>
                <option value="PARCIAL">PARCIAL</option>
                <option value="PAGADA">PAGADA</option>
                <option value="ANULADA">ANULADA</option>
            </select>

            <label className="flex items-center gap-2 text-sm text-gray-600 whitespace-nowrap">
                <input
                    type="checkbox"
                    checked={conSaldo}
                    onChange={(e) => setConSaldo(e.target.checked)}
                    className="accent-blue-600"
                />
                Solo con saldo
            </label>

            {(fechaInicio || fechaFin || cliente || tipo || estado || conSaldo) && (
                <button
                    onClick={() => {
                        setFechaInicio("");
                        setFechaFin("");
                        setCliente("");
                        setTipo("");
                        setEstado("");
                        setConSaldo(false);
                    }}
                    className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded hover:bg-red-100 transition text-sm flex items-center gap-2"
                    title="Limpiar todos los filtros"
                >
                    <i className="fas fa-eraser"></i>
                </button>
            )}
        </div>
    );
}
