import { obtenerOrdenes, obtenerClientesActivos } from "@/actions/ordenes";
import ModalOrden from "@/components/ModalOrden";

// Colores por estado
const ESTILOS_ESTADO: Record<string, string> = {
    "Pendiente":   "bg-gray-100 text-gray-800",
    "En proceso":  "bg-yellow-100 text-yellow-800 border border-yellow-200",
    "Finalizado":  "bg-green-100 text-green-800 border border-green-200",
};

export default async function OrdenesPage() {
    // Traemos las órdenes y los clientes activos en paralelo
    const [ordenes, clientes] = await Promise.all([
        obtenerOrdenes(),
        obtenerClientesActivos(),
    ]);

    return (
        <div>
            {/* Encabezado */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800">Órdenes de Trabajo</h2>
                <ModalOrden clientes={clientes} />
            </div>

            {/* Filtros */}
            <div className="bg-white p-4 rounded shadow mb-6 flex gap-4 text-black">
                <input
                    type="text"
                    placeholder="Buscar por Cliente..."
                    className="border p-2 rounded w-1/3 outline-none focus:border-blue-500"
                />
                <select className="border p-2 rounded outline-none focus:border-blue-500">
                    <option value="">Todos los Estados</option>
                    <option value="Pendiente">Pendiente</option>
                    <option value="En proceso">En proceso</option>
                    <option value="Finalizado">Finalizado</option>
                </select>
                <button className="bg-gray-800 text-white px-6 py-2 rounded hover:bg-gray-700 transition">
                    Filtrar
                </button>
            </div>

            {/* Tabla */}
            <div className="bg-white rounded shadow overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-100 border-b">
                        <tr className="text-gray-700 font-semibold">
                            <th className="p-4">N° Orden</th>
                            <th className="p-4">Cliente</th>
                            <th className="p-4">Fecha</th>
                            <th className="p-4">Notas</th>
                            <th className="p-4 text-center">Estado</th>
                            <th className="p-4 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="text-black">
                        {ordenes.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-gray-500 bg-gray-50">
                                    No hay órdenes registradas. ¡Hacé clic en &quot;+ Nueva Orden&quot; para crear la primera!
                                </td>
                            </tr>
                        ) : (
                            ordenes.map((orden) => (
                                <tr key={orden.id_orden} className="border-b hover:bg-gray-50">

                                    {/* Número de orden */}
                                    <td className="p-4 font-bold text-gray-700">
                                        #{String(orden.id_orden).padStart(5, "0")}
                                    </td>

                                    {/* Cliente */}
                                    <td className="p-4 font-medium text-gray-800">
                                        {orden.cliente
                                            ? `${orden.cliente.apellido}, ${orden.cliente.nombre}`
                                            : "—"}
                                    </td>

                                    {/* Fecha */}
                                    <td className="p-4 text-gray-600">
                                        {new Date(orden.fecha_creacion).toLocaleDateString("es-AR")}
                                    </td>

                                    {/* Notas */}
                                    <td className="p-4 text-gray-500 text-sm max-w-xs truncate">
                                        {orden.notas_internas || "—"}
                                    </td>

                                    {/* Estado */}
                                    <td className="p-4 text-center">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${ESTILOS_ESTADO[orden.estado_trabajo ?? "Pendiente"] ?? "bg-gray-100 text-gray-800"}`}>
                                            {orden.estado_trabajo?.toUpperCase() ?? "PENDIENTE"}
                                        </span>
                                    </td>

                                    {/* Acciones */}
                                    <td className="p-4 text-center">
                                        <button className="text-blue-600 mr-2 hover:text-blue-800" title="Ver / Editar">
                                            <i className="fas fa-edit"></i>
                                        </button>
                                        <button
                                            className={`font-bold ${orden.estado_trabajo === "Finalizado" ? "text-green-600 hover:text-green-800" : "text-gray-300 cursor-not-allowed"}`}
                                            title={orden.estado_trabajo === "Finalizado" ? "Generar Factura" : "La orden debe estar finalizada para facturar"}
                                            disabled={orden.estado_trabajo !== "Finalizado"}
                                        >
                                            <i className="fas fa-file-invoice-dollar"></i>
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
