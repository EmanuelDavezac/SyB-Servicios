import { getFacturas, getOrdenesPendientesFacturacion } from "@/actions/facturacion";
import { obtenerClientesConDeuda, obtenerCobros } from "@/actions/cobros";
import { ESTADOS_FACTURA } from "@/lib/estadoFactura";
import FiltrosFacturacion from "@/components/FiltrosFacturacion";
import ModalFactura from "@/components/ModalFactura";
import ModalCobro from "@/components/ModalCobro";
import BotonImprimirFactura from "@/components/BotonImprimirFactura";
import BotonImprimirRecibo from "@/components/BotonImprimirRecibo";
import BotonAnularCobro from "@/components/BotonAnularCobro";

type FilaComprobante = {
    key: string;
    origen: "factura" | "recibo";
    id: number;
    tipo: string | null;
    fecha: string | Date;
    fecha_vencimiento: string | Date | null;
    comprobante: string;
    nombreCliente: string;
    textoBusqueda: string;
    total: number | null;
    saldo: number | null;
    estado_pago: string | null;
};

export default async function FacturacionPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const params = await searchParams;
    const ordenIdQuery = typeof params.orden === "string" ? params.orden : undefined;
    const fechaInicioStr = typeof params.fechaInicio === "string" ? params.fechaInicio : "";
    const fechaFinStr = typeof params.fechaFin === "string" ? params.fechaFin : "";
    const filtroCliente = typeof params.cliente === "string" ? params.cliente.toLowerCase() : "";
    const filtroTipo = typeof params.tipo === "string" ? params.tipo : "";
    const filtroEstado = typeof params.estado === "string" ? params.estado.toUpperCase() : "";
    const soloConSaldo = params.conSaldo === "1";

    const [facturasOriginales, ordenesPendientes, clientesConDeuda, recibosOriginales] = await Promise.all([
        getFacturas(),
        getOrdenesPendientesFacturacion(),
        obtenerClientesConDeuda(),
        obtenerCobros(),
    ]);

    const filasFactura: FilaComprobante[] = facturasOriginales.map((f: any) => {
        const cliente = f.orden_trabajo?.cliente;
        const nombreCliente = cliente
            ? `${cliente.nombre} ${cliente.apellido}`
            : (f.descripcion || "Desconocido");
        return {
            key: `factura-${f.id_factura}`,
            origen: "factura",
            id: f.id_factura,
            tipo: f.tipo,
            fecha: f.fecha_emision,
            fecha_vencimiento: f.fecha_vencimiento,
            comprobante: f.num_factura,
            nombreCliente,
            textoBusqueda: `${nombreCliente} ${f.descripcion || ""}`.toLowerCase(),
            total: f.monto_total !== null ? Number(f.monto_total) : null,
            saldo: f.saldo_pendiente !== null ? Number(f.saldo_pendiente) : null,
            estado_pago: f.estado_pago,
        };
    });

    const filasRecibo: FilaComprobante[] = recibosOriginales.map((r: any) => {
        const nombreCliente = r.cliente ? `${r.cliente.nombre} ${r.cliente.apellido}` : "Desconocido";
        return {
            key: `recibo-${r.id_recibo}`,
            origen: "recibo",
            id: r.id_recibo,
            tipo: null,
            fecha: r.fecha_pago,
            fecha_vencimiento: null,
            comprobante: `Recibo #${r.id_recibo}`,
            nombreCliente,
            textoBusqueda: `${nombreCliente} ${r.observacion || ""}`.toLowerCase(),
            total: Number(r.monto_total),
            saldo: null,
            estado_pago: null,
        };
    });

    const todasLasFilas = [...filasFactura, ...filasRecibo];

    // Filtramos en memoria (o podrías pasarlo a Prisma)
    const facturas = todasLasFilas.filter((fila) => {
        if (fechaInicioStr) {
            const fi = new Date(`${fechaInicioStr}T00:00:00`);
            if (new Date(fila.fecha) < fi) return false;
        }

        if (fechaFinStr) {
            const ff = new Date(`${fechaFinStr}T23:59:59.999`);
            if (new Date(fila.fecha) > ff) return false;
        }

        if (filtroCliente) {
            if (!fila.textoBusqueda.includes(filtroCliente)) return false;
        }

        if (filtroTipo === "Recibo") {
            if (fila.origen !== "recibo") return false;
        } else if (filtroTipo) {
            if (fila.origen !== "factura" || fila.tipo !== filtroTipo) return false;
        }

        // Estado y saldo solo tienen sentido para comprobantes facturables;
        // un filtro de estado/saldo activo excluye naturalmente todo lo
        // demás (recibos, informes técnicos, etc.) porque no tienen valor.
        if (filtroEstado) {
            if (fila.estado_pago !== filtroEstado) return false;
        }

        if (soloConSaldo) {
            if (!(fila.saldo !== null && fila.saldo > 0)) return false;
        }

        return true;
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
                <div className="flex gap-3">
                    <ModalCobro clientes={clientesConDeuda} />
                    <ModalFactura ordenes={ordenesPendientes} openWithOrdenId={ordenIdQuery} />
                </div>
            </div>

            <FiltrosFacturacion />

            <div className="bg-white rounded shadow text-black overflow-hidden">
                <div className="grid grid-cols-7 font-bold bg-gray-50 border-b p-4 text-sm text-gray-700">
                    <div>Fecha / Venc.</div>
                    <div>Comprobante</div>
                    <div>Cliente</div>
                    <div>Total</div>
                    <div>Saldo</div>
                    <div>Estado</div>
                    <div className="text-right">Acciones</div>
                </div>

                {facturas.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        No se encontraron comprobantes con los filtros actuales.
                    </div>
                ) : (
                    facturas.map((fila) => {
                        // Un comprobante no facturable (informe técnico, o un recibo)
                        // no tiene estado de pago ni saldo: la columna va vacía, nunca
                        // en $0,00 ni con el badge NO_APLICA.
                        const esFacturable = fila.origen === "factura" && fila.estado_pago !== ESTADOS_FACTURA.NO_APLICA;
                        const esInformeTecnico = fila.origen === "factura" && (fila.tipo === "Informe Tecnico" || fila.tipo === "Informe Técnico");

                        let badgeColor = "bg-gray-200 text-gray-800";
                        switch (fila.estado_pago) {
                            case "PAGADA": badgeColor = "bg-green-100 text-green-800 border border-green-200"; break;
                            case "IMPAGA": badgeColor = "bg-red-100 text-red-800 border border-red-200"; break;
                            case "PARCIAL": badgeColor = "bg-yellow-100 text-yellow-800 border border-yellow-200"; break;
                            case "ANULADA": badgeColor = "bg-gray-200 text-gray-500 border border-gray-300"; break;
                        }

                        // Calcular si vencio
                        let vencioTag = null;
                        if (esFacturable && fila.fecha_vencimiento && fila.estado_pago !== "PAGADA" && fila.estado_pago !== "ANULADA") {
                            const venc = new Date(fila.fecha_vencimiento);
                            const hoy = new Date();
                            if (venc < hoy) {
                                vencioTag = <div className="text-xs text-red-600 font-semibold mt-1">Venció {formatDate(venc)}</div>;
                            }
                        }

                        return (
                            <div key={fila.key} className="grid grid-cols-7 items-center p-4 border-b hover:bg-gray-50 text-sm">
                                <div>
                                    <div className="text-gray-900">{formatDate(fila.fecha)}</div>
                                    {vencioTag || <div className="text-xs text-gray-400 mt-1">{esFacturable && fila.fecha_vencimiento ? `Vence ${formatDate(fila.fecha_vencimiento)}` : ""}</div>}
                                </div>
                                <div className="font-semibold text-gray-800">{fila.comprobante}</div>
                                <div className="text-gray-600">{fila.nombreCliente}</div>
                                <div className="font-bold text-blue-800">
                                    {esInformeTecnico ? "" : (fila.total !== null ? formatCurrency(fila.total) : "-")}
                                </div>
                                <div className="font-bold text-red-700">
                                    {esInformeTecnico ? "" : (esFacturable ? formatCurrency(fila.saldo ?? 0) : <span className="text-gray-400 font-normal">-</span>)}
                                </div>
                                <div>
                                    {esInformeTecnico ? "" : (esFacturable ? (
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${badgeColor}`}>
                                            {fila.estado_pago}
                                        </span>
                                    ) : (
                                        <span className="text-gray-400">-</span>
                                    ))}
                                </div>
                                <div className="text-right flex justify-end gap-3 text-lg opacity-70">
                                    {fila.origen === "recibo" ? (
                                        <>
                                            <BotonImprimirRecibo idRecibo={fila.id} />
                                            <BotonAnularCobro idRecibo={fila.id} />
                                        </>
                                    ) : (
                                        <>
                                            <BotonImprimirFactura idFactura={fila.id} />
                                            <button title="Editar/Ver" className="hover:text-amber-600">📝</button>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
