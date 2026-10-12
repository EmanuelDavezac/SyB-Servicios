import Link from "next/link";
import { obtenerProveedores } from "@/actions/proveedores";
import ModalProveedor from "@/components/ModalProveedor";
import BotonBajaProveedor from "@/components/BotonBajaProveedor";
import FiltrosProveedores from "@/components/FiltrosProveedores";

export default async function ProveedoresPage({
    searchParams,
}: {
    searchParams: Promise<{ razonSocial?: string; cuit?: string; estado?: string }>;
}) {
    const params = await searchParams;
    const razonSocial = params.razonSocial;
    const cuit = params.cuit;
    const estado = params.estado;

    const proveedores = await obtenerProveedores({ incluirInactivos: true, razonSocial, cuit, estado });
    const hayFiltrosActivos = !!(razonSocial || cuit || estado);

    return (
        <div>
            {/* Encabezado */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800">Proveedores</h2>
                <ModalProveedor />
            </div>

            <FiltrosProveedores />

            {/* Tabla */}
            <div className="bg-white rounded shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left">
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
                                    {hayFiltrosActivos ? (
                                        <>
                                            No se encontraron proveedores que coincidan.{" "}
                                            <Link href="/proveedores" className="text-blue-600 hover:underline">
                                                Limpiar filtros
                                            </Link>
                                        </>
                                    ) : (
                                        <>No hay proveedores registrados. ¡Hacé clic en &quot;+ Nuevo Proveedor&quot; para agregar el primero!</>
                                    )}
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
                                        <div className="flex items-center justify-center gap-3">
                                            <ModalProveedor
                                                proveedorInicial={{
                                                    id_proveedor: prov.id_proveedor,
                                                    razon_social: prov.razon_social,
                                                    nombre_proveedor: prov.nombre_proveedor ?? null,
                                                    cuit: prov.cuit ?? null,
                                                    telefono: prov.telefono ?? null,
                                                    email: prov.email ?? null,
                                                }}
                                                trigger={
                                                    <button
                                                        className="text-blue-600 hover:text-blue-800"
                                                        title="Editar proveedor"
                                                    >
                                                        <i className="fas fa-edit" />
                                                    </button>
                                                }
                                            />
                                            <BotonBajaProveedor
                                                idProveedor={prov.id_proveedor}
                                                nombreProveedor={prov.razon_social}
                                                estadoActual={prov.estado ?? true}
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
