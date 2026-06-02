import { obtenerInsumos, obtenerProveedores } from "@/actions/insumos";
import ModalInsumo from "@/components/ModalInsumo";
import BotonEliminarInsumo from "@/components/BotonEliminarInsumo";
import FiltrosInsumos from "@/components/FiltrosInsumos";

export default async function InsumosPage({ searchParams }: { searchParams: Promise<{ busqueda?: string; estado?: string; proveedor?: string }> }) {
    const params = await searchParams;

    // Traemos los insumos y proveedores desde la base de datos
    const [todosLosInsumos, proveedores] = await Promise.all([
        obtenerInsumos(),
        obtenerProveedores(),
    ]);

    // Aplicamos los filtros en el servidor
    let insumos = todosLosInsumos;

    // Filtro por nombre
    if (params.busqueda) {
        const texto = params.busqueda.toLowerCase();
        insumos = insumos.filter((i) =>
            i.nombre.toLowerCase().includes(texto) ||
            (i.descripcion && i.descripcion.toLowerCase().includes(texto))
        );
    }

    // Filtro por proveedor
    if (params.proveedor) {
        const idProv = Number(params.proveedor);
        insumos = insumos.filter((i) => i.id_proveedor === idProv);
    }

    // Filtro por estado (activo / inactivo)
    if (params.estado === "activo") {
        insumos = insumos.filter((i) => i.estado !== false);
    } else if (params.estado === "inactivo") {
        insumos = insumos.filter((i) => i.estado === false);
    }

    return (
        <div>
            {/* ENCABEZADO */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800">Control de Insumos</h2>
                {/* Botón para crear nuevo insumo */}
                <ModalInsumo proveedores={proveedores} />
            </div>

            {/* BUSCADOR DINÁMICO */}
            <FiltrosInsumos proveedores={proveedores} />

            {/* TABLA DINÁMICA */}
            <div className="bg-white rounded shadow overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-100 border-b">
                        <tr className="text-gray-700 font-semibold">
                            <th className="p-4">Nombre / Descripción</th>
                            <th className="p-4">Proveedor</th>
                            <th className="p-4">Stock vs Mínimo</th>
                            <th className="p-4 text-center">Estado</th>
                            <th className="p-4 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="text-black">
                        {insumos.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-gray-500 bg-gray-50">
                                    No hay insumos cargados. ¡Hacé clic en "+ Nuevo Insumo" para empezar!
                                </td>
                            </tr>
                        ) : (
                            insumos.map((insumo) => {
                                // Lógica matemática para la barra de stock
                                const stockActual = insumo.stock_actual || 0;
                                const stockMinimo = insumo.stock_minimo || 0;
                                const isCritical = stockActual === 0;
                                const isLow = stockActual > 0 && stockActual <= stockMinimo;

                                const textColor = isCritical ? 'text-red-600' : isLow ? 'text-orange-500' : 'text-green-600';
                                const barColor = isCritical ? 'bg-red-500' : isLow ? 'bg-orange-500' : 'bg-green-500';

                                // El porcentaje no puede superar el 100% visualmente
                                const porcentaje = stockMinimo === 0 ? 100 : Math.min(100, (stockActual / stockMinimo) * 100);

                                return (
                                    <tr key={insumo.id_insumo} className={`border-b hover:bg-gray-50 ${!insumo.estado ? "bg-gray-50 text-gray-400" : ""}`}>

                                        {/* NOMBRE Y DESCRIPCIÓN */}
                                        <td className="p-4">
                                            <div className="font-bold text-gray-800">{insumo.nombre}</div>
                                            {insumo.descripcion && (
                                                <div className="text-sm text-gray-500 mt-1">{insumo.descripcion}</div>
                                            )}
                                        </td>

                                        {/* PROVEEDOR */}
                                        <td className="p-4 text-gray-600">
                                            {insumo.proveedor?.razon_social || insumo.proveedor?.nombre_proveedor || "Sin asignar"}
                                        </td>

                                        {/* BARRITA DE STOCK DINÁMICA */}
                                        <td className="p-4">
                                            <div className="flex flex-col w-40">
                                                <span className={`font-bold ${textColor}`}>
                                                    {stockActual} <span className="text-gray-400 text-xs font-normal ml-1">(Mín: {stockMinimo})</span>
                                                </span>
                                                <div className="w-full bg-gray-200 h-2 mt-2 rounded-full overflow-hidden">
                                                    <div className={`${barColor} h-full transition-all duration-500`} style={{ width: `${porcentaje}%` }}></div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* ESTADO */}
                                        <td className="p-4 text-center">
                                            {insumo.estado ?? true ? (
                                                <span className="bg-green-100 text-green-800 px-3 py-1 rounded text-xs font-bold">ACTIVO</span>
                                            ) : (
                                                <span className="bg-gray-200 text-gray-600 px-3 py-1 rounded text-xs font-bold">INACTIVO</span>
                                            )}
                                        </td>

                                        {/* ACCIONES */}
                                        <td className="p-4 text-center">
                                            <div className="flex justify-center items-center gap-2">
                                                {/* Botón para editar insumo existente */}
                                                <ModalInsumo insumoAEditar={insumo} proveedores={proveedores} />

                                                {/* Botón para dar de baja */}
                                                <BotonEliminarInsumo idInsumo={insumo.id_insumo} />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}