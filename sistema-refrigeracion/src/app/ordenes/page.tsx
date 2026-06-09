import { obtenerOrdenes, obtenerClientesActivos } from "@/actions/ordenes";
import ModalOrden from "@/components/ModalOrden";
import FiltrosOrdenes from "@/components/FiltrosOrdenes";
import Link from "next/link";

// Colores por estado
const ESTILOS_ESTADO: Record<string, string> = {
    "Pendiente":   "bg-gray-100 text-gray-800",
    "En proceso":  "bg-yellow-100 text-yellow-800 border border-yellow-200",
    "Finalizado":  "bg-green-100 text-green-800 border border-green-200",
};

export default async function OrdenesPage({ searchParams }: { searchParams: Promise<{ busqueda?: string; estado?: string }> }) {
    const params = await searchParams;

    // Traemos las órdenes y los clientes activos en paralelo
    const [todasLasOrdenes, clientes] = await Promise.all([
        obtenerOrdenes(),
        obtenerClientesActivos(),
    ]);

    let ordenes = todasLasOrdenes;

    // Filtro por nombre o apellido del cliente
    if (params.busqueda) {
        const busqueda = params.busqueda.toLowerCase();
        ordenes = ordenes.filter((orden) => {
            const nombreCompleto = `${orden.cliente?.nombre || ""} ${orden.cliente?.apellido || ""}`.toLowerCase();
            const apellidoNombre = `${orden.cliente?.apellido || ""} ${orden.cliente?.nombre || ""}`.toLowerCase();
            return nombreCompleto.includes(busqueda) || apellidoNombre.includes(busqueda);
        });
    }

    // Filtro por estado
    if (params.estado) {
        ordenes = ordenes.filter((orden) => (orden.estado_trabajo || "Pendiente") === params.estado);
    }

    return (
        <div>
            {/* Encabezado */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800">Órdenes de Trabajo</h2>
                <ModalOrden clientes={clientes} />
            </div>

            {/* Filtros */}
            <FiltrosOrdenes />

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

                                        {/* Botón Editar → abre ModalOrden en modo edición */}
                                        <ModalOrden
                                            clientes={clientes}
                                            ordenInicial={{
                                                id_orden: orden.id_orden,
                                                id_cliente: orden.id_cliente,
                                                estado_trabajo: orden.estado_trabajo ?? "Pendiente",
                                                notas_internas: orden.notas_internas ?? null,
                                            }}
                                            trigger={
                                                <button
                                                    className="text-blue-600 mr-2 hover:text-blue-800"
                                                    title="Editar orden"
                                                >
                                                    <i className="fas fa-edit" />
                                                </button>
                                            }
                                        />

                                        {/* Botón Facturar → solo habilitado si la orden está Finalizada */}
                                        {orden.estado_trabajo === "Finalizado" ? (
                                            <Link
                                                href={`/facturacion?orden=${orden.id_orden}`}
                                                title="Generar Factura"
                                                className="text-green-600 hover:text-green-800 font-bold"
                                            >
                                                <i className="fas fa-file-invoice-dollar" />
                                            </Link>
                                        ) : (
                                            <button
                                                className="text-gray-300 cursor-not-allowed font-bold"
                                                title="La orden debe estar finalizada para facturar"
                                                disabled
                                            >
                                                <i className="fas fa-file-invoice-dollar" />
                                            </button>
                                        )}

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
