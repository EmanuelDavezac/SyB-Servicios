"use client";

import { useState } from "react";
import { crearFacturaProveedor } from "@/actions/factura-proveedor";

type Proveedor = {
    id_proveedor: number;
    razon_social: string;
    nombre_proveedor: string | null;
};

export default function ModalFacturaProveedor({ proveedores = [] }: { proveedores?: Proveedor[] }) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [nombreArchivo, setNombreArchivo] = useState(""); // NUEVO: Estado para el archivo

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError("");

        const formData = new FormData(e.currentTarget);

        const idProveedorVal = formData.get("id_proveedor") as string;
        const monto = parseFloat(formData.get("monto_total") as string);

        // NUEVO: Capturar el archivo para que tu Server Action lo guarde o suba
        const archivoFactura = formData.get("archivo_factura") as File;
        if (archivoFactura && archivoFactura.size > 0) {
            console.log("Archivo listo para enviar junto con los datos:", archivoFactura.name);
            // Podrías pasar el formData completo a tu action si usas upload local o en la nube
        }

        const res = await crearFacturaProveedor({
            id_proveedor: idProveedorVal ? Number(idProveedorVal) : undefined,
            num_factura: (formData.get("num_factura") as string) || undefined,
            tipo: (formData.get("tipo") as string) || undefined,
            fecha_emision: formData.get("fecha_emision") as string,
            monto_total: monto,
            estado_pago: (formData.get("estado_pago") as string) || "Impaga",
            notas: (formData.get("notas") as string) || undefined,
            // archivo: archivoFactura // <-- Descomentar si tu backend soporta recibir el archivo
        });

        setLoading(false);

        if (res.success) {
            setIsOpen(false);
            setNombreArchivo("");
            (e.target as HTMLFormElement).reset();
        } else {
            setError("Hubo un error al registrar la factura. Verificá los datos e intentá de nuevo.");
        }
    }

    const today = new Date().toISOString().split("T")[0];

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold px-4 py-2 rounded shadow transition"
                title="Cargar factura de proveedor"
            >
                <i className="fas fa-file-invoice-dollar"></i>
                Cargar Factura
            </button>

            {isOpen && (
                <div className="fixed inset-0 bg-slate-900 bg-opacity-60 flex justify-center items-center z-50 overflow-y-auto p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col text-gray-800 my-auto">
                        {/* ENCABEZADO */}
                        <div className="flex justify-between items-center bg-gray-50 border-b px-6 py-4 rounded-t-xl">
                            <h3 className="text-xl font-bold flex items-center gap-2 text-gray-700">
                                <i className="fas fa-file-invoice-dollar text-amber-500"></i>
                                Registrar Factura
                            </h3>
                            <button
                                type="button"
                                onClick={() => { setIsOpen(false); setNombreArchivo(""); }}
                                className="text-gray-400 hover:text-red-500 transition text-xl"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[75vh]">

                                {/* PROVEEDOR Y NÚMERO */}
                                <section>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Proveedor</label>
                                            <select
                                                name="id_proveedor"
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                            >
                                                <option value="">Sin asignar...</option>
                                                {proveedores.map((prov) => (
                                                    <option key={prov.id_proveedor} value={prov.id_proveedor}>
                                                        {prov.razon_social || prov.nombre_proveedor}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-1">N° de Factura</label>
                                                <input name="num_factura" type="text" placeholder="Ej: 0001-00012345" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-1">Monto Total ($) *</label>
                                                <input name="monto_total" type="number" step="0.01" min="0" required placeholder="0.00" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* ADJUNTAR ARCHIVO (NUEVO) */}
                                <section className="border-t border-gray-100 pt-4">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Adjuntar Comprobante</label>
                                    <div className="flex items-center gap-3">
                                        <label className="cursor-pointer px-4 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-200 transition font-medium flex items-center gap-2 text-sm">
                                            <i className="fas fa-paperclip"></i> Seleccionar archivo
                                            <input
                                                type="file"
                                                name="archivo_factura"
                                                className="hidden"
                                                accept=".pdf,image/png,image/jpeg"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    setNombreArchivo(file ? file.name : "");
                                                }}
                                            />
                                        </label>
                                        {nombreArchivo && (
                                            <span className="text-sm text-slate-600 truncate max-w-[200px]" title={nombreArchivo}>
                                                {nombreArchivo}
                                            </span>
                                        )}
                                    </div>
                                </section>

                                {/* FECHAS Y ESTADO */}
                                <section className="border-t border-gray-100 pt-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Fecha Emisión *</label>
                                            <input name="fecha_emision" type="date" required defaultValue={today} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Estado</label>
                                            <select name="estado_pago" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                                                <option value="Impaga">Impaga</option>
                                                <option value="Pagada">Pagada</option>
                                            </select>
                                        </div>
                                    </div>
                                </section>

                                {error && (
                                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                        <i className="fas fa-exclamation-circle mr-2"></i>{error}
                                    </div>
                                )}
                            </div>

                            {/* BOTONERA */}
                            <div className="flex justify-end gap-3 border-t px-6 py-4 bg-gray-50 rounded-b-xl">
                                <button type="button" onClick={() => { setIsOpen(false); setNombreArchivo(""); }} className="px-5 py-2 border rounded-lg text-gray-700 font-medium hover:bg-gray-100">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={loading} className="px-5 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
                                    {loading ? "Guardando..." : "Registrar Factura"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}