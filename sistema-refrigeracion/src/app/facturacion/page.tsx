import { getFacturas, getOrdenesPendientesFacturacion } from "@/actions/facturacion";
import FiltrosFacturacion from "@/components/FiltrosFacturacion";
import ModalFactura from "@/components/ModalFactura";

export default async function FacturacionPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const params = await searchParams;
    const filtroComprobante = typeof params.comprobante === "string" ? params.comprobante.toLowerCase() : "";
    const filtroCliente = typeof params.cliente === "string" ? params.cliente.toLowerCase() : "";
    const filtroEstado = typeof params.estado === "string" ? params.estado.toUpperCase() : "";

    const facturasOriginales = await getFacturas();
    const ordenesPendientes = await getOrdenesPendientesFacturacion();

    // Filtramos en memoria (o podrías pasarlo a Prisma)
    const facturas = facturasOriginales.filter((f: any) => {
        let coincide = true;

        if (filtroComprobante) {
            if (!f.num_factura?.toLowerCase().includes(filtroComprobante)) coincide = false;
        }

        if (filtroCliente) {
            const nombreCliente = `${f.orden_trabajo?.cliente?.nombre} ${f.orden_trabajo?.cliente?.apellido} ${f.descripcion || ""}`.toLowerCase();
            if (!nombreCliente.includes(filtroCliente)) coincide = false;
        }

        if (filtroEstado) {
            if (f.estado_pago !== filtroEstado) coincide = false;
        }

        return coincide;
    });

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("es-AR", {
            style: "currency",
            currency: "ARS",
        }).format(amount);
    };

    const formatDate = (date: string | Date | null) => {
        if (!date) return "-";
        const d = new Date(date);
        return d.toLocaleDateString("es-AR");
    };

    return (
        <div className="p-8 pb-20 font-sans max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Facturación</h1>
                <ModalFactura ordenes={ordenesPendientes} />
            </div>

            <FiltrosFacturacion />

            <div className="bg-white rounded shadow text-black overflow-hidden">
                <div className="grid grid-cols-6 font-bold bg-gray-50 border-b p-4 text-sm text-gray-700">
                    <div>Fecha / Venc.</div>
                    <div>Comprobante</div>
                    <div>Cliente</div>
                    <div>Importe Total</div>
                    <div>Estado</div>
                    <div className="text-right">Acciones</div>
                </div>

                {facturas.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        No se encontraron comprobantes con los filtros actuales.
                    </div>
                ) : (
                    facturas.map((factura: any) => {
                        const cliente = factura.orden_trabajo?.cliente;
                        const nombreCliente = cliente 
                            ? `${cliente.nombre} ${cliente.apellido}` 
                            : (factura.descripcion || "Desconocido");

                        let badgeColor = "bg-gray-200 text-gray-800";
                        switch (factura.estado_pago) {
                            case "PAGADA": badgeColor = "bg-green-100 text-green-800 border border-green-200"; break;
                            case "IMPAGA": badgeColor = "bg-red-100 text-red-800 border border-red-200"; break;
                            case "PENDIENTE": badgeColor = "bg-yellow-100 text-yellow-800 border border-yellow-200"; break;
                            case "ENTREGADO": badgeColor = "bg-blue-100 text-blue-800 border border-blue-200"; break;
                            case "ANULADA": badgeColor = "bg-gray-200 text-gray-500 border border-gray-300"; break;
                        }

                        // Calcular si vencio
                        let vencioTag = null;
                        if (factura.fecha_vencimiento && factura.estado_pago !== "PAGADA" && factura.estado_pago !== "ANULADA") {
                            const venc = new Date(factura.fecha_vencimiento);
                            const hoy = new Date();
                            if (venc < hoy) {
                                vencioTag = <div className="text-xs text-red-600 font-semibold mt-1">Venció {formatDate(venc)}</div>;
                            }
                        }

                        return (
                            <div key={factura.id_factura} className="grid grid-cols-6 items-center p-4 border-b hover:bg-gray-50 text-sm">
                                <div>
                                    <div className="text-gray-900">{formatDate(factura.fecha_emision)}</div>
                                    {vencioTag || <div className="text-xs text-gray-400 mt-1">{factura.fecha_vencimiento ? `Vence ${formatDate(factura.fecha_vencimiento)}` : ""}</div>}
                                </div>
                                <div className="font-semibold text-gray-800">{factura.num_factura}</div>
                                <div className="text-gray-600">{nombreCliente}</div>
                                <div className="font-bold text-blue-800">
                                    {factura.monto_total ? formatCurrency(parseFloat(factura.monto_total)) : "-"}
                                </div>
                                <div>
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${badgeColor}`}>
                                        {factura.estado_pago}
                                    </span>
                                </div>
                                <div className="text-right flex justify-end gap-3 text-lg opacity-70">
                                    <button title="Imprimir" className="hover:text-blue-600">🖨️</button>
                                    <button title="Editar/Ver" className="hover:text-amber-600">📝</button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
