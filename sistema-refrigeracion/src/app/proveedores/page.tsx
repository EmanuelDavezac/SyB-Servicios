import { obtenerProveedores } from "@/actions/proveedores";

export default async function ProveedoresPage() {
    const proveedores = await obtenerProveedores();

    return (
        <div>
            {/* Encabezado */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800">Proveedores</h2>
                {/* Botón "Nuevo Proveedor" — modal se agrega después */}
                <button
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition flex items-center gap-2"
                    disabled
                    title="Próximamente"
                >
                    <i className="fas fa-plus" /> Nuevo Proveedor
                </button>
            </div>

            {/* Tabla */}
            <div className="bg-white rounded shadow overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-100 border-b">
                        <tr className="text-gray-700 font-semibold">
                            <th className="p-4">Razón Social</th>
                            <th className="p-4">Contacto</th>
                            <th className="p-4">CUIT</th>
                            <th className="p-4">Teléfono</th>
                            <th className="p-4 text-center">Estado</th>
                            <th className="p-4 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="text-black">
                        {proveedores.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-gray-500 bg-gray-50">
                                    No hay proveedores registrados. ¡Hacé clic en &quot;+ Nuevo Proveedor&quot; para agregar el primero!
                                </td>
                            </tr>
                        ) : (
                            proveedores.map((prov) => (
                                <tr
                                    key={prov.id_proveedor}
                                    className={`border-b hover:bg-gray-50 ${!prov.estado ? "bg-gray-50 text-gray-400" : ""}`}
                                >
                                    {/* Razón social + nombre de contacto */}
                                    <td className="p-4">
                                        <div className="font-bold text-gray-800">{prov.razon_social}</div>
                                        {prov.nombre_proveedor && (
                                            <div className="text-sm text-gray-500 mt-0.5">{prov.nombre_proveedor}</div>
                                        )}
                                    </td>

                                    {/* Email */}
                                    <td className="p-4 text-gray-600 text-sm">
                                        {prov.email ? (
                                            <a href={`mailto:${prov.email}`} className="text-blue-600 hover:underline">
                                                {prov.email}
                                            </a>
                                        ) : "—"}
                                    </td>

                                    {/* CUIT */}
                                    <td className="p-4 text-gray-600 font-mono text-sm">
                                        {prov.cuit || "—"}
                                    </td>

                                    {/* Teléfono */}
                                    <td className="p-4 text-gray-600">
                                        {prov.telefono || "—"}
                                    </td>

                                    {/* Estado */}
                                    <td className="p-4 text-center">
                                        {prov.estado ?? true ? (
                                            <span className="bg-green-100 text-green-800 px-3 py-1 rounded text-xs font-bold">ACTIVO</span>
                                        ) : (
                                            <span className="bg-gray-200 text-gray-600 px-3 py-1 rounded text-xs font-bold">INACTIVO</span>
                                        )}
                                    </td>

                                    {/* Acciones */}
                                    <td className="p-4 text-center">
                                        <button
                                            className="text-blue-500 hover:text-blue-700 mr-3"
                                            title="Editar proveedor (próximamente)"
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
