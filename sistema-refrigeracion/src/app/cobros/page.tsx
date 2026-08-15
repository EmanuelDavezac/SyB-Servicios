import { obtenerClientesConDeuda, obtenerCobros } from "@/actions/cobros";
import ModalCobro from "@/components/ModalCobro";
import BotonAnularCobro from "@/components/BotonAnularCobro";

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(amount);
}

function formatDate(date: string | Date | null) {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("es-AR");
}

export default async function CobrosPage() {
    const [clientesConDeuda, cobros] = await Promise.all([
        obtenerClientesConDeuda(),
        obtenerCobros(),
    ]);

    const totalDeuda = clientesConDeuda.reduce((acc: number, c: any) => acc + c.saldo, 0);

    return (
        <div className="p-8 pb-20 font-sans max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Cobros</h1>
                <ModalCobro clientes={clientesConDeuda} />
            </div>

            <section className="mb-10">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold text-gray-800">Cuentas por Cobrar</h2>
                    <span className="text-sm font-semibold text-gray-600">
                        Total pendiente: <span className="text-red-700">{formatCurrency(totalDeuda)}</span>
                    </span>
                </div>

                <div className="bg-white rounded shadow text-black overflow-hidden">
                    <div className="grid grid-cols-3 font-bold bg-gray-50 border-b p-4 text-sm text-gray-700">
                        <div>Cliente</div>
                        <div>Facturas Pendientes</div>
                        <div className="text-right">Saldo</div>
                    </div>

                    {clientesConDeuda.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">No hay cuentas pendientes.</div>
                    ) : (
                        clientesConDeuda.map((c: any) => (
                            <div key={c.id_cliente} className="grid grid-cols-3 items-center p-4 border-b hover:bg-gray-50 text-sm">
                                <div className="font-semibold text-gray-800">{c.apellido}, {c.nombre}</div>
                                <div className="text-gray-600">{c.cantidadFacturas}</div>
                                <div className="text-right font-bold text-red-700">{formatCurrency(c.saldo)}</div>
                            </div>
                        ))
                    )}
                </div>
            </section>

            <section>
                <h2 className="text-lg font-bold text-gray-800 mb-3">Historial de Recibos</h2>

                <div className="bg-white rounded shadow text-black overflow-hidden">
                    <div className="grid grid-cols-6 font-bold bg-gray-50 border-b p-4 text-sm text-gray-700">
                        <div>Fecha</div>
                        <div>Cliente</div>
                        <div>Forma de Pago</div>
                        <div>Facturas Imputadas</div>
                        <div className="text-right">Monto</div>
                        <div className="text-right">Acciones</div>
                    </div>

                    {cobros.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">Todavía no se registraron cobros.</div>
                    ) : (
                        cobros.map((r: any) => (
                            <div key={r.id_recibo} className="grid grid-cols-6 items-center p-4 border-b hover:bg-gray-50 text-sm">
                                <div className="text-gray-900">{formatDate(r.fecha_pago)}</div>
                                <div className="text-gray-600">{r.cliente?.apellido}, {r.cliente?.nombre}</div>
                                <div className="text-gray-600">{r.forma_pago || "-"}</div>
                                <div className="text-gray-600 text-xs">
                                    {r.pagos_parciales.map((p: any) => p.factura?.num_factura || `#${p.id_factura}`).join(", ")}
                                </div>
                                <div className="text-right font-bold text-green-700">{formatCurrency(Number(r.monto_total))}</div>
                                <div className="text-right">
                                    <BotonAnularCobro idRecibo={r.id_recibo} />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>
        </div>
    );
}
