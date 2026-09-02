import { obtenerInformesTecnicos } from "@/actions/informesTecnicos";
import { obtenerClientes } from "@/actions/clientes";
import ModalInformeTecnico from "@/components/ModalInformeTecnico";
import BotonImprimirInforme from "@/components/BotonImprimirInforme";
import BotonAnularInforme from "@/components/BotonAnularInforme";

export default async function InformesTecnicosPage() {
    const [informes, clientes] = await Promise.all([
        obtenerInformesTecnicos(),
        obtenerClientes(),
    ]);

    const formatDate = (date: string | Date | null) => {
        if (!date) return "-";
        return new Date(date).toLocaleDateString("es-AR");
    };

    return (
        <div className="p-8 pb-20 font-sans max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Informes Técnicos</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Solo documentan el trabajo realizado: no generan deuda ni se cobran.
                    </p>
                </div>
                <ModalInformeTecnico clientes={clientes} />
            </div>

            <div className="bg-white rounded shadow text-black overflow-hidden">
                <div className="grid grid-cols-5 font-bold bg-gray-50 border-b p-4 text-sm text-gray-700">
                    <div>Fecha</div>
                    <div>Número</div>
                    <div>Destinatario</div>
                    <div>Contenido</div>
                    <div className="text-right">Acciones</div>
                </div>

                {informes.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        Todavía no se cargaron informes técnicos.
                    </div>
                ) : (
                    informes.map((informe: any) => {
                        const anulado = informe.estado === "ANULADO";

                        return (
                            <div key={informe.id_informe} className={`grid grid-cols-5 items-center p-4 border-b hover:bg-gray-50 text-sm ${anulado ? "opacity-50" : ""}`}>
                                <div className="text-gray-900">{formatDate(informe.fecha)}</div>
                                <div className="font-semibold text-gray-800">
                                    {informe.numero || `#${informe.id_informe}`}
                                    {anulado && (
                                        <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-gray-200 text-gray-500 border border-gray-300">
                                            ANULADO
                                        </span>
                                    )}
                                </div>
                                <div className="text-gray-600">{informe.destinatario}</div>
                                <div className="text-gray-500 text-xs truncate pr-4" title={informe.descripcion || ""}>
                                    {informe.descripcion || "-"}
                                </div>
                                <div className="text-right flex justify-end gap-3 text-lg opacity-70">
                                    <BotonImprimirInforme informe={informe} />
                                    {!anulado && <BotonAnularInforme idInforme={informe.id_informe} />}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
