import Link from "next/link";
import { obtenerServicios } from "@/actions/servicios";
import ModalServicio from "@/components/ModalServicio";
import BotonBajaServicio from "@/components/BotonBajaServicio";
import FiltrosServicios from "@/components/FiltrosServicios";

export default async function ServiciosPage({
    searchParams,
}: {
    searchParams: Promise<{ nombre?: string; precioDesde?: string; precioHasta?: string; estado?: string }>;
}) {
    const params = await searchParams;
    const nombre = params.nombre;
    const precioDesde = params.precioDesde !== undefined ? parseFloat(params.precioDesde) : undefined;
    const precioHasta = params.precioHasta !== undefined ? parseFloat(params.precioHasta) : undefined;
    const estado = params.estado;

    const servicios = await obtenerServicios({
        incluirInactivos: true,
        nombre,
        precioDesde: precioDesde !== undefined && !Number.isNaN(precioDesde) ? precioDesde : undefined,
        precioHasta: precioHasta !== undefined && !Number.isNaN(precioHasta) ? precioHasta : undefined,
        estado,
    });
    const hayFiltrosActivos = !!(nombre || precioDesde !== undefined || precioHasta !== undefined || estado);

    return (
        <div>
            {/* Encabezado */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800">Servicios</h2>
                <ModalServicio />
            </div>

            <FiltrosServicios />

            {/* Tabla */}
            <div className="bg-white rounded shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left">
                    <thead className="bg-gray-100 border-b">
                        <tr className="text-gray-700 font-semibold">
                            <th className="p-4">Nombre</th>
                            <th className="p-4">Descripción</th>
                            <th className="p-4 text-right">Precio</th>
                            <th className="p-4 text-center">Estado</th>
                            <th className="p-4 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="text-black">
                        {servicios.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-gray-500 bg-gray-50">
                                    {hayFiltrosActivos ? (
                                        <>
                                            No se encontraron servicios que coincidan.{" "}
                                            <Link href="/servicios" className="text-blue-600 hover:underline">
                                                Limpiar filtros
                                            </Link>
                                        </>
                                    ) : (
                                        <>No hay servicios registrados. ¡Hacé clic en &quot;+ Nuevo Servicio&quot; para agregar el primero!</>
                                    )}
                                </td>
                            </tr>
                        ) : (
                            servicios.map((srv) => (
                                <tr key={srv.id_servicio} className={`border-b hover:bg-gray-50 ${!srv.estado ? "bg-gray-50 text-gray-400" : ""}`}>
                                    {/* Nombre */}
                                    <td className="p-4 font-bold text-gray-800">
                                        {srv.nombre}
                                    </td>

                                    {/* Descripción */}
                                    <td className="p-4 text-gray-500 text-sm max-w-xs truncate">
                                        {srv.descripcion || "—"}
                                    </td>

                                    {/* Precio */}
                                    <td className="p-4 text-right font-semibold text-gray-700">
                                        ${Number(srv.precio).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                                    </td>

                                    {/* Estado */}
                                    <td className="p-4 text-center">
                                        {srv.estado ?? true ? (
                                            <span className="bg-green-100 text-green-800 px-3 py-1 rounded text-xs font-bold">ACTIVO</span>
                                        ) : (
                                            <span className="bg-gray-200 text-gray-600 px-3 py-1 rounded text-xs font-bold">INACTIVO</span>
                                        )}
                                    </td>

                                    {/* Acciones */}
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center items-center">
                                            <ModalServicio
                                                servicioInicial={{
                                                    id_servicio: srv.id_servicio,
                                                    nombre: srv.nombre,
                                                    descripcion: srv.descripcion ?? null,
                                                    precio: Number(srv.precio),
                                                    servicio_insumo: srv.servicio_insumo,
                                                }}
                                                trigger={
                                                    <button
                                                        className="text-blue-600 hover:text-blue-800"
                                                        title="Editar servicio"
                                                    >
                                                        <i className="fas fa-edit" />
                                                    </button>
                                                }
                                            />
                                            <BotonBajaServicio
                                                idServicio={srv.id_servicio}
                                                nombreServicio={srv.nombre}
                                                estadoActual={srv.estado ?? true}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
              </div>
            </div>
        </div>
    );
}
