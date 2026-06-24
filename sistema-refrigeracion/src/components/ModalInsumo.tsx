"use client";

import { useState } from "react";
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
};

type Proveedor = {
    id_proveedor: number;
    razon_social: string;
    nombre_proveedor: string | null;
};

export default function ModalInsumo({ insumoAEditar, proveedores = [] }: { insumoAEditar?: Insumo; proveedores?: Proveedor[] }) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const esEdicion = !!insumoAEditar;

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

        // Como la base de datos EXIGE precios, los mandamos en 0 por defecto de forma invisible
        const precio_costo = insumoAEditar?.precio_costo ? Number(insumoAEditar.precio_costo) : 0;
        const precio_venta = insumoAEditar?.precio_venta ? Number(insumoAEditar.precio_venta) : 0;

        let res;
        if (esEdicion && insumoAEditar) {
            res = await actualizarInsumo(insumoAEditar.id_insumo, {
                nombre, descripcion, id_proveedor, stock_actual, stock_minimo, precio_costo, precio_venta
            });
        } else {
            res = await crearInsumo({
                nombre, descripcion, id_proveedor, stock_actual, stock_minimo, precio_costo, precio_venta
            });
        }

        setLoading(false);
        if (res.success) {
            setIsOpen(false);
        } else {
            alert("Hubo un error al intentar guardar el insumo.");
        }
    }

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

            {isOpen && (
                <div className="modal-backdrop overflow-y-auto">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col text-gray-800 my-auto">
                        {/* ENCABEZADO */}
                        <div className="modal-header">
                            <h3 className="text-xl font-bold">
                                {esEdicion ? "Editar Insumo" : "Alta de Insumo"}
                            </h3>
                            <button type="button" onClick={() => setIsOpen(false)} className="text-white hover:text-white/80 transition">
                                <i className="fas fa-times text-lg"></i>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="px-6 py-5 space-y-6 overflow-y-auto max-h-[75vh]">
                                
                                <section>
                                    <h4 className="section-title">DATOS GENERALES</h4>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Nombre del Insumo *</label>
                                            <input name="nombre" type="text" required defaultValue={insumoAEditar?.nombre || ""} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" placeholder="Ej: Tubo de cobre 1/4" />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-1">Unidad (ej. Metros, Kg)</label>
                                                <input name="descripcion" type="text" defaultValue={insumoAEditar?.descripcion || ""} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" placeholder="Unidad..." />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-1">Proveedor</label>
                                                <select name="id_proveedor" defaultValue={insumoAEditar?.id_proveedor || ""} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
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

                                <section>
                                    <h4 className="section-title">CONTROL DE STOCK</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Cantidad Inicial *</label>
                                            <input name="stock_actual" type="number" required defaultValue={insumoAEditar?.stock_actual ?? ""} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-red-600 mb-1">Stock Mínimo (Alerta) *</label>
                                            <input name="stock_minimo" type="number" required defaultValue={insumoAEditar?.stock_minimo ?? ""} className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-500 bg-white" />
                                        </div>
                                    </div>
                                </section>

                            </div>

                            {/* BOTONERA */}
                            <div className="modal-footer">
                                <button type="button" onClick={() => setIsOpen(false)} className="btn-outline">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={loading} className="btn-primary">
                                    {loading ? "Guardando..." : "Guardar Insumo"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}