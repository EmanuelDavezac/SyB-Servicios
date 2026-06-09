import { obtenerServicios } from "@/actions/servicios";

export default async function ServiciosPage() {
    const servicios = await obtenerServicios();

    return (
        <div>
            {/* Encabezado */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800">Servicios</h2>
                {/* Botón "Nuevo Servicio" — modal se agrega después */}
                <button
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition flex items-center gap-2"
                    disabled
                    title="Próximamente"
                >
                    <i className="fas fa-plus" /> Nuevo Servicio
                </button>
            </div>

            {/* Tabla */}
            <div className="bg-white rounded shadow overflow-hidden">
                <table className="w-full text-left">
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
                                    No hay servicios registrados. ¡Hacé clic en &quot;+ Nuevo Servicio&quot; para agregar el primero!
                                </td>
                            </tr>
                        ) : (
                            servicios.map((srv) => (
                                <tr
                                    key={srv.id_servicio}
                                    className={`border-b hover:bg-gray-50 ${!srv.estado ? "bg-gray-50 text-gray-400" : ""}`}
                                >
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
                                        <button
                                            className="text-blue-500 hover:text-blue-700 mr-3"
                                            title="Editar servicio (próximamente)"
                                            disabled
                                        >
                                            <i className="fas fa-edit" />
                                        </button>
                                        <button
                                            className="text-red-400 hover:text-red-600"
                                            title="Dar de baja (próximamente)"
                                            disabled
                                        >
                                            <i className="fas fa-toggle-off" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
