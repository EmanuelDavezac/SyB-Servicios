"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { crearInsumo, actualizarInsumo } from "@/actions/insumos";

type Insumo = {
    id_insumo: number;
    id_proveedor: number | null;
    nombre: string;
    descripcion: string | null;
    stock_actual: number | null;
    stock_minimo: number | null;
    precio_costo: any;
    precio_venta: any;
    estado?: boolean;
    proveedor?: any;
};

type Proveedor = {
    id_proveedor: number;
    razon_social: string;
    nombre_proveedor: string | null;
};

export default function ModalInsumo({ insumoAEditar, proveedores = [] }: { insumoAEditar?: Insumo; proveedores?: Proveedor[] }) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);

    const esEdicion = !!insumoAEditar;

    useEffect(() => { setMounted(true); }, []);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const nombre = formData.get("nombre") as string;
        const descripcion = formData.get("descripcion") as string; // Acá guardamos la "Unidad"

        const stock_actual = Number(formData.get("stock_actual")) || 0;
        const stock_minimo = Number(formData.get("stock_minimo")) || 0;

        const proveedorValue = formData.get("id_proveedor");
        const id_proveedor = proveedorValue ? Number(proveedorValue) : undefined;

        const estadoValue = formData.get("estado");
        const estado = estadoValue === "true";

        const precio_costo = Number(formData.get("precio_costo")) || 0;
        const precio_venta = Number(formData.get("precio_venta")) || 0;

        let res;
        if (esEdicion && insumoAEditar) {
            res = await actualizarInsumo(insumoAEditar.id_insumo, {
                nombre, descripcion, id_proveedor, stock_actual, stock_minimo, precio_costo, precio_venta, estado
            });
        } else {
            res = await crearInsumo({
                nombre, descripcion, id_proveedor, stock_actual, stock_minimo, precio_costo, precio_venta, estado
            });
        }

        setLoading(false);
        if (res.success) {
            setIsOpen(false);
        } else {
            alert("Hubo un error al intentar guardar el insumo.");
        }
    }

    const inputCls =
        "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400";

    const modal = (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-[9999] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col text-gray-800 overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-sky-600 to-sky-700 text-white">
                    <div>
                        <h3 className="text-lg font-bold tracking-wide">
                            {esEdicion ? "Editar Insumo" : "Alta de Insumo"}
                        </h3>
                        <p className="text-sky-100 text-xs mt-0.5">
                            {esEdicion ? "Modificá los datos del insumo." : "Completá los datos del nuevo insumo."}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="text-white/70 hover:text-white text-2xl leading-none transition"
                    >
                        &times;
                    </button>
                </div>

                {/* Formulario */}
                <form onSubmit={handleSubmit}>
                    <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[70vh]">

                        {/* ── Identificación ── */}
                        <section>
                            <h4 className="text-xs font-bold uppercase tracking-widest text-sky-600 mb-3 border-b pb-1">
                                Datos del insumo
                            </h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Nombre del Insumo *</label>
                                    <input
                                        name="nombre"
                                        type="text"
                                        required
                                        defaultValue={insumoAEditar?.nombre || ""}
                                        placeholder="Ej: Gas refrigerante R-22"
                                        className={inputCls}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Unidad (ej. Metro, Kg, Unidad)</label>
                                        <input
                                            name="descripcion"
                                            type="text"
                                            defaultValue={insumoAEditar?.descripcion || ""}
                                            placeholder="Ej: kg"
                                            className={inputCls}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Proveedor</label>
                                        <select
                                            name="id_proveedor"
                                            defaultValue={insumoAEditar?.id_proveedor || ""}
                                            className={inputCls + " bg-white"}
                                        >
                                            <option value="">Seleccionar...</option>
                                            {proveedores.map((prov) => (
                                                <option key={prov.id_proveedor} value={prov.id_proveedor}>
                                                    {prov.razon_social || prov.nombre_proveedor}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* ── Precios ── */}
                        <section>
                            <h4 className="text-xs font-bold uppercase tracking-widest text-sky-600 mb-3 border-b pb-1">
                                Precio por unidad de medida
                            </h4>
                            <p className="text-xs text-gray-400 mb-3">
                                Si la unidad es metro o kilogramo, cargá el precio de 1 metro/kilo. Al usar menos de 1 en una orden, el precio se calcula proporcionalmente.
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Precio Costo *</label>
                                    <input
                                        name="precio_costo"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        required
                                        defaultValue={insumoAEditar?.precio_costo ?? ""}
                                        placeholder="0.00"
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Precio Venta *</label>
                                    <input
                                        name="precio_venta"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        required
                                        defaultValue={insumoAEditar?.precio_venta ?? ""}
                                        placeholder="0.00"
                                        className={inputCls}
                                    />
                                </div>
                            </div>
                        </section>

                        {/* ── Stock ── */}
                        <section>
                            <h4 className="text-xs font-bold uppercase tracking-widest text-sky-600 mb-3 border-b pb-1">
                                Stock
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Cantidad Inicial *</label>
                                    <input
                                        name="stock_actual"
                                        type="number"
                                        step="0.001"
                                        required
                                        defaultValue={insumoAEditar?.stock_actual ?? ""}
                                        placeholder="0"
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-red-500 mb-1">Stock Mínimo (Alerta) *</label>
                                    <input
                                        name="stock_minimo"
                                        type="number"
                                        step="0.001"
                                        required
                                        defaultValue={insumoAEditar?.stock_minimo ?? ""}
                                        placeholder="0"
                                        className="w-full border border-red-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                                    />
                                </div>
                            </div>
                        </section>
                    </div>


                    {/* NUEVO: SELECTOR DE ESTADO */}
                    <div className="pb-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Estado del Insumo</label>
                        <select
                            name="estado"
                            defaultValue={insumoAEditar?.estado !== false ? "true" : "false"}
                            className="w-full border border-gray-300 p-2 rounded focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none bg-white"
                        >
                            <option value="true">Activo (Visible)</option>
                            <option value="false">Inactivo (Oculto/Dado de baja)</option>
                        </select>
                    </div>
                    {/* Footer */}
                    <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="px-5 py-2 text-sm border rounded-lg text-gray-600 hover:bg-gray-100 font-medium transition"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-5 py-2 text-sm bg-sky-600 text-white rounded-lg hover:bg-sky-700 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                                    Guardando...
                                </span>
                            ) : (
                                esEdicion ? "Guardar Cambios" : "Guardar Insumo"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    return (
        <>
            {esEdicion ? (
                <button onClick={() => setIsOpen(true)} className="text-blue-600 hover:text-blue-800 font-bold px-2 py-1" title="Editar">
                    <i className="fas fa-edit"></i>
                </button>
            ) : (
                <button onClick={() => setIsOpen(true)} className="bg-sky-600 text-white px-4 py-2 rounded shadow hover:bg-sky-700 transition">
                    + Nuevo Insumo
                </button>
            )}
            {isOpen && mounted && createPortal(modal, document.body)}
        </>
    );
}