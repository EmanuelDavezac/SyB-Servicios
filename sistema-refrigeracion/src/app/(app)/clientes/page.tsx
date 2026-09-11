import { obtenerClientes } from "@/actions/clientes";
import ModalCliente from "@/components/ModalCliente";
import BotonEliminarCliente from "@/components/BotonEliminarCliente";
import FiltrosClientes from "@/components/FiltrosClientes";

export default async function ClientesPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const params = await searchParams;
    const nombre = typeof params.nombre === "string" ? params.nombre : undefined;
    const cuit = typeof params.cuit === "string" ? params.cuit : undefined;
    const estado = typeof params.estado === "string" ? params.estado : undefined;

    // Traemos los clientes directamente de Neon usando la acción de Prisma
    const clientes = await obtenerClientes({ nombre, cuit, estado });

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800">Gestión de Clientes</h2>
                {/* Inyectamos el botón con el modal interactivo que creamos recién */}
                <ModalCliente />
            </div>

            <FiltrosClientes />

            {/* Tu Tabla del Prototipo, ahora 100% Dinámica */}
            <div className="bg-white rounded shadow overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-100 border-b">
                        <tr className="text-gray-700 font-semibold">
                            <th className="p-4">Nombre / Razón Social</th>
                            <th className="p-4">DNI / CUIT</th>
                            <th className="p-4">Contacto</th>
                            <th className="p-4">Estado</th>
                            <th className="p-4 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="text-black">
                        {clientes.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-gray-500 bg-gray-50">
                                    No hay clientes reales guardados en la base de datos. ¡Hacé clic en "+ Nuevo Cliente" para cargar el primero!
                                </td>
                            </tr>
                        ) : (
                            // Mapeamos el array de la base de datos para generar las filas reales
                            clientes.map((cliente) => (
                                <tr key={cliente.id_cliente} className={`border-b hover:bg-gray-50 ${!cliente.estado ? "bg-gray-50 text-gray-400" : ""}`}>
                                    <td className="p-4 font-medium text-gray-800">
                                        {cliente.apellido}, {cliente.nombre}
                                    </td>
                                    <td className="p-4 text-gray-600">
                                        {cliente.cuit || "—"}
                                    </td>
                                    <td className="p-4 text-gray-600">
                                        {cliente.telefono || "—"}
                                        {cliente.email && (
                                            <>
                                                <br />
                                                <span className="text-xs text-gray-400">{cliente.email}</span>
                                            </>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        {cliente.estado ?? true ? (
                                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">ACTIVO</span>
                                        ) : (
                                            <span className="bg-gray-200 text-gray-600 px-2 py-1 rounded text-xs font-bold">INACTIVO</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center items-center gap-2">
                                            <ModalCliente cliente={cliente} />
                                            <BotonEliminarCliente
                                                idCliente={cliente.id_cliente}
                                                nombreCliente={`${cliente.nombre} ${cliente.apellido}`}
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
    );
}