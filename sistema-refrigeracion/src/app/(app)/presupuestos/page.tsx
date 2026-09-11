import { obtenerPresupuestos } from "@/actions/presupuestos";
import FiltrosPresupuestos from "@/components/FiltrosPresupuestos";
import ModalPresupuesto from "@/components/ModalPresupuesto";
import AccionesPresupuesto from "@/components/AccionesPresupuesto";

export default async function PresupuestosPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const params = await searchParams;
    const fechaInicio = typeof params.fechaInicio === "string" ? params.fechaInicio : undefined;
    const fechaFin = typeof params.fechaFin === "string" ? params.fechaFin : undefined;
    const estado = typeof params.estado === "string" ? params.estado : undefined;

    const presupuestos = await obtenerPresupuestos({ estado, fechaInicio, fechaFin });

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(amount);

    const formatDate = (date: string | Date | null) => {
        if (!date) return "-";
        return new Date(date).toLocaleDateString("es-AR");
    };

    return (
        <div className="p-8 pb-20 font-sans max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Presupuestos</h1>
                <ModalPresupuesto />
            </div>

            <FiltrosPresupuestos />

            <div className="bg-white rounded shadow text-black overflow-hidden">
                <div className="grid grid-cols-7 font-bold bg-gray-50 border-b p-4 text-sm text-gray-700">
                    <div>N°</div>
                    <div>Fecha</div>
                    <div>Destinatario</div>
                    <div>Total</div>
                    <div>Estado</div>
                    <div>Vencimiento</div>
                    <div className="text-right">Acciones</div>
                </div>

                {presupuestos.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        No se encontraron presupuestos con los filtros actuales.
                    </div>
                ) : (
                    presupuestos.map((p: any) => {
                        let badgeColor = "bg-gray-200 text-gray-800";
                        switch (p.estado) {
                            case "PENDIENTE": badgeColor = "bg-yellow-100 text-yellow-800 border border-yellow-200"; break;
                            case "ACEPTADO": badgeColor = "bg-green-100 text-green-800 border border-green-200"; break;
                            case "RECHAZADO": badgeColor = "bg-red-100 text-red-800 border border-red-200"; break;
                        }

                        return (
                            <div key={p.id_presupuesto} className="grid grid-cols-7 items-center p-4 border-b hover:bg-gray-50 text-sm">
                                <div className="font-semibold text-gray-800">
                                    0001-{String(p.numero).padStart(10, "0")}
                                </div>
                                <div className="text-gray-900">{formatDate(p.fecha_emision)}</div>
                                <div className="text-gray-600">
                                    {p.destinatario_nombre}
                                </div>
                                <div className="font-bold text-blue-800">{formatCurrency(p.total)}</div>
                                <div>
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${badgeColor}`}>
                                        {p.estado}
                                    </span>
                                </div>
                                <div>
                                    {p.estado === "PENDIENTE" && p.vencido ? (
                                        <span className="text-xs text-red-600 font-semibold bg-red-50 border border-red-200 px-2 py-1 rounded">
                                            Vencido {formatDate(p.fecha_vencimiento)}
                                        </span>
                                    ) : (
                                        <span className="text-xs text-gray-400">{formatDate(p.fecha_vencimiento)}</span>
                                    )}
                                </div>
                                <AccionesPresupuesto presupuesto={p} />
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
