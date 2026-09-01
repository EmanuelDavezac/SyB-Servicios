import { obtenerCompras } from "@/actions/compras";
import { obtenerProveedores } from "@/actions/insumos";
import ModalCompra from "@/components/ModalCompra";
import BotonEliminarCompra from "@/components/BotonEliminarCompra";

export default async function ComprasPage() {
    const [compras, proveedores] = await Promise.all([
        obtenerCompras(),
        obtenerProveedores(),
    ]);

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(value);

    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800">Compras a Proveedores</h2>
                <ModalCompra proveedores={proveedores} />
            </div>

            <div className="bg-white rounded shadow overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-100 border-b">
                        <tr className="text-gray-700 font-semibold">
                            <th className="p-4">Fecha</th>
                            <th className="p-4">Proveedor</th>
                            <th className="p-4">Insumos</th>
                            <th className="p-4 text-right">Neto</th>
                            <th className="p-4 text-right">IVA</th>
                            <th className="p-4 text-right">Total</th>
                            <th className="p-4 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="text-black">
                        {compras.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="p-8 text-center text-gray-500 bg-gray-50">
                                    No hay compras cargadas. Hacé clic en "+ Nueva Compra" para empezar.
                                </td>
                            </tr>
                        ) : (
                            compras.map((c: any) => {
                                const neto = c.neto !== null ? Number(c.neto) : null;
                                const alicuota = c.alicuota_iva !== null ? Number(c.alicuota_iva) : null;
                                const iva = neto !== null && alicuota !== null ? (neto * alicuota) / 100 : null;

                                return (
                                    <tr key={c.id_compra} className="border-b hover:bg-gray-50">
                                        <td className="p-4 text-gray-600">{formatDate(c.fecha_compra)}</td>
                                        <td className="p-4 text-gray-600">
                                            {c.proveedor?.razon_social || c.proveedor?.nombre_proveedor || "Sin asignar"}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-wrap gap-1">
                                                {c.detalle_compra?.map((d: any) => (
                                                    <span key={d.id_detalle_compra} className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">
                                                        {d.insumo?.nombre ?? "Insumo"} x{d.cantidad}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right text-gray-700">
                                            {neto !== null ? formatCurrency(neto) : <span className="text-gray-300">-</span>}
                                        </td>
                                        <td className="p-4 text-right text-gray-700">
                                            {iva !== null ? formatCurrency(iva) : <span className="text-gray-300">-</span>}
                                        </td>
                                        <td className="p-4 text-right font-semibold text-gray-800">
                                            {formatCurrency(Number(c.costo_total))}
                                        </td>
                                        <td className="p-4 text-center">
                                            <BotonEliminarCompra idCompra={c.id_compra} />
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
