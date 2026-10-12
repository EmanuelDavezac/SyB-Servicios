import { obtenerInsumos } from "@/actions/insumos";
import { obtenerProveedores } from "@/actions/proveedores";
import ModalInsumo from "@/components/ModalInsumo";
import BotonBajaInsumo from "@/components/BotonBajaInsumo";
import FiltrosInsumos from "@/components/FiltrosInsumos";

export default async function InsumosPage({ searchParams }: { searchParams: Promise<{ busqueda?: string; estado?: string; proveedor?: string; stockBajo?: string }> }) {
    const params = await searchParams;

    // Traemos los insumos y proveedores desde la base de datos. Los
    // proveedores para el selector de alta/edicion quedan solo activos (ver
    // mas abajo el agregado puntual del proveedor inactivo de un insumo que
    // ya lo tenia asignado); acá para el filtro de "Proveedor" de la tabla
    // conviene ver todos, insumos inactivos pueden tener uno inactivo.
    const [todosLosInsumos, proveedoresActivos, todosLosProveedores] = await Promise.all([
        obtenerInsumos({ incluirInactivos: true }),
        obtenerProveedores(),
        obtenerProveedores({ incluirInactivos: true }),
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

    // Filtro por stock bajo (stock actual <= stock mínimo)
    if (params.stockBajo === "1") {
        insumos = insumos.filter((i) => (i.stock_actual ?? 0) <= (i.stock_minimo ?? 0));
    }

    return (
        <div>
            {/* ENCABEZADO */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800">Control de Insumos</h2>

                <ModalInsumo proveedores={proveedoresActivos} />
            </div>

            {/* BUSCADOR DINÁMICO */}
            <FiltrosInsumos proveedores={todosLosProveedores} />

            {/* TABLA DINÁMICA */}
            <div className="bg-white rounded shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left">
                    <thead className="bg-gray-100 border-b">
                        <tr className="text-gray-700 font-semibold">
                            <th className="p-4">Nombre / Descripción</th>
                            <th className="p-4">Proveedor</th>
                            <th className="p-4">Precio (por unidad)</th>
                            <th className="p-4">Stock vs Mínimo</th>
                            <th className="p-4 text-center">Estado</th>
                            <th className="p-4 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="text-black">
                        {insumos.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-gray-500 bg-gray-50">
                                    No hay insumos cargados. ¡Hacé clic en "+ Nuevo Insumo" para empezar!
                                </td>
                            </tr>
                        ) : (
                            insumos.map((insumo) => {
                                // Lógica matemática para la barra de stock
                                const stockActual = insumo.stock_actual || 0;
                                const stockMinimo = insumo.stock_minimo || 0;
                                // Stock negativo: se facturó más de lo que había (confirmado a
                                // propósito al emitir la factura). Hay que cargar una compra o
                                // ajustar el stock.
                                const isNegative = stockActual < 0;
                                const isCritical = stockActual === 0;
                                const isLow = stockActual > 0 && stockActual <= stockMinimo;

                                const textColor = isNegative ? 'text-red-700' : isCritical ? 'text-red-600' : isLow ? 'text-orange-500' : 'text-green-600';
                                const barColor = isNegative || isCritical ? 'bg-red-500' : isLow ? 'bg-orange-500' : 'bg-green-500';

                                // El porcentaje no puede superar el 100% visualmente, ni bajar de 0% (stock negativo)
                                const porcentaje = stockMinimo === 0 ? 100 : Math.min(100, Math.max(0, (stockActual / stockMinimo) * 100));

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

                                        {/* PRECIO POR UNIDAD */}
                                        <td className="p-4 text-gray-700">
                                            <div className="font-semibold">
                                                {new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(insumo.precio_venta)}
                                                <span className="text-gray-400 text-xs font-normal ml-1">
                                                    / {insumo.descripcion || "unidad"}
                                                </span>
                                            </div>
                                        </td>

                                        {/* BARRITA DE STOCK DINÁMICA */}
                                        <td className="p-4">
                                            <div className="flex flex-col w-40">
                                                <span className={`font-bold ${textColor}`}>
                                                    {stockActual} <span className="text-gray-400 text-xs font-normal ml-1">(Mín: {stockMinimo})</span>
                                                </span>
                                                {isNegative && (
                                                    <span className="mt-1 inline-block w-fit bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                                                        Stock negativo
                                                    </span>
                                                )}
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
                                                {/* Botón para editar insumo existente. Si el proveedor que ya
                                                    tenia asignado se dio de baja, se agrega igual a la lista
                                                    (ModalInsumo lo marca "(inactivo)") para no perder el dato
                                                    al guardar sin tocar ese campo. */}
                                                <ModalInsumo
                                                    insumoAEditar={insumo as any}
                                                    proveedores={
                                                        insumo.proveedor && insumo.proveedor.estado === false && !proveedoresActivos.some((p) => p.id_proveedor === insumo.proveedor!.id_proveedor)
                                                            ? [...proveedoresActivos, insumo.proveedor]
                                                            : proveedoresActivos
                                                    }
                                                />

                                                {/* Botón para dar de baja */}
                                                <BotonBajaInsumo
                                                    idInsumo={insumo.id_insumo}
                                                    nombreInsumo={insumo.nombre}
                                                    estadoActual={insumo.estado ?? true}
                                                />
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
        </div>
    );
}