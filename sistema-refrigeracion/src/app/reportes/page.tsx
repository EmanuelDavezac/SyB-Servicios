import { obtenerReporteMensual, obtenerReporteServicios } from "@/actions/reportes";

export default async function ReportesPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
    const params = await searchParams;
    const hoy = new Date();
    // Determinando mes y año por los query params o default a hoy
    const mesSeleccionado = params?.mes ? parseInt(params.mes) : hoy.getMonth() + 1;
    const anioSeleccionado = params?.anio ? parseInt(params.anio) : hoy.getFullYear();
    const tipoReporte = params?.tipo || "ingresos-egresos";

    // Cargar datos de DB
    let movimientos: any[] = [];
    let totalIngresos = 0;
    let totalEgresos = 0;
    let balanceGeneral = 0;
    let ordenesFinalizadas: any[] = [];

    if (tipoReporte === "servicios") {
        ordenesFinalizadas = await obtenerReporteServicios(mesSeleccionado, anioSeleccionado);
    } else {
        const res = await obtenerReporteMensual(mesSeleccionado, anioSeleccionado);
        movimientos = res.movimientos;
        totalIngresos = res.totalIngresos;
        totalEgresos = res.totalEgresos;
        balanceGeneral = res.balanceGeneral;
    }

    const formatCurrency = (value: number) => 
        new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);

    const formatDate = (dateString: string) => {
        const d = new Date(dateString);
        return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const meses = [
        { id: 1, nombre: 'Enero' }, { id: 2, nombre: 'Febrero' }, { id: 3, nombre: 'Marzo' },
        { id: 4, nombre: 'Abril' }, { id: 5, nombre: 'Mayo' }, { id: 6, nombre: 'Junio' },
        { id: 7, nombre: 'Julio' }, { id: 8, nombre: 'Agosto' }, { id: 9, nombre: 'Septiembre' },
        { id: 10, nombre: 'Octubre' }, { id: 11, nombre: 'Noviembre' }, { id: 12, nombre: 'Diciembre' }
    ];

    const mesActualNombre = meses.find(m => m.id === mesSeleccionado)?.nombre || '';
    const anios = Array.from({ length: 6 }, (_, i) => hoy.getFullYear() - 2 + i); // Desde 2 años atras hasta 3 adelante

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-slate-800">Reportes y Alertas</h2>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded text-slate-600 hover:bg-gray-50 transition">
                        <i className="fas fa-print"></i> Imprimir
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition">
                        <i className="fas fa-file-excel"></i> Exportar Excel
                    </button>
                </div>
            </div>

            {/* Filters */}
            <form method="GET" action="/reportes" className="bg-white p-4 rounded shadow-sm border border-gray-100 flex items-end gap-6">
                <div className="flex-1">
                    <label className="block text-sm text-gray-600 mb-1">Tipo de Reporte</label>
                    <select name="tipo" defaultValue={tipoReporte} className="w-full border border-gray-200 rounded p-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500">
                        <option value="ingresos-egresos">Mensual de Ingresos y Egresos</option>
                        <option value="servicios">Servicios Realizados</option>
                    </select>
                </div>
                <div className="flex-1">
                    <label className="block text-sm text-gray-600 mb-1">Mes</label>
                    <select name="mes" defaultValue={mesSeleccionado} className="w-full border border-gray-200 rounded p-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500">
                        {meses.map(m => (
                            <option key={m.id} value={m.id}>{m.nombre}</option>
                        ))}
                    </select>
                </div>
                <div className="flex-1">
                    <label className="block text-sm text-gray-600 mb-1">Año</label>
                    <select name="anio" defaultValue={anioSeleccionado} className="w-full border border-gray-200 rounded p-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500">
                        {anios.map(a => (
                            <option key={a} value={a}>{a}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <button type="submit" className="px-6 py-2 bg-slate-800 text-white rounded hover:bg-slate-700 transition">
                        Generar
                    </button>
                </div>
            </form>

            {/* Resume Cards (Solo para ingresos-egresos) */}
            {tipoReporte === "ingresos-egresos" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded shadow-sm border border-gray-100 border-l-4 border-l-green-500">
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Total Ingresos</p>
                        <p className="text-3xl font-bold text-slate-800">{formatCurrency(totalIngresos)}</p>
                    </div>
                    <div className="bg-white p-6 rounded shadow-sm border border-gray-100 border-l-4 border-l-red-500">
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Total Egresos (Insumos)</p>
                        <p className="text-3xl font-bold text-slate-800">{formatCurrency(totalEgresos)}</p>
                    </div>
                    <div className="bg-white p-6 rounded shadow-sm border border-gray-100 border-l-4 border-l-sky-500">
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Balance General</p>
                        <p className="text-3xl font-bold text-slate-800">{formatCurrency(balanceGeneral)}</p>
                    </div>
                </div>
            )}

            {/* Summary for Services (Opcional, podrías poner un contador) */}
            {tipoReporte === "servicios" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded shadow-sm border border-gray-100 border-l-4 border-l-blue-500">
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Servicios Finalizados</p>
                        <p className="text-3xl font-bold text-slate-800">{ordenesFinalizadas.length}</p>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 bg-slate-50">
                    <h3 className="text-sm font-semibold text-slate-700">
                        {tipoReporte === "servicios" ? "Órdenes de Trabajo Finalizadas" : "Detalle de Movimientos"} - {mesActualNombre} {anioSeleccionado}
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    {tipoReporte === "servicios" ? (
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="border-b border-gray-100 text-slate-500">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Fecha</th>
                                    <th className="px-4 py-3 font-medium">N° Orden</th>
                                    <th className="px-4 py-3 font-medium">Cliente</th>
                                    <th className="px-4 py-3 font-medium">Servicios Realizados</th>
                                    <th className="px-4 py-3 font-medium text-right">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {ordenesFinalizadas.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-gray-400">No hay servicios finalizados en este período.</td>
                                    </tr>
                                ) : (
                                    ordenesFinalizadas.map((orden) => (
                                        <tr key={orden.id_orden} className="hover:bg-slate-50">
                                            <td className="px-4 py-4">{formatDate(orden.fecha_creacion)}</td>
                                            <td className="px-4 py-4 font-semibold">#{orden.id_orden}</td>
                                            <td className="px-4 py-4">{orden.cliente?.nombre} {orden.cliente?.apellido}</td>
                                            <td className="px-4 py-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {orden.detalle_orden_servicio?.map((d: any) => (
                                                        <span key={d.id_detalle_srv} className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">
                                                            {d.servicio?.nombre}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded">
                                                    {orden.estado_trabajo}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="border-b border-gray-100 text-slate-500">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Fecha</th>
                                    <th className="px-4 py-3 font-medium">Comprobante</th>
                                    <th className="px-4 py-3 font-medium">Detalle / Entidad</th>
                                    <th className="px-4 py-3 font-medium text-right">Ingreso (+)</th>
                                    <th className="px-4 py-3 font-medium text-right">Egreso (-)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {movimientos.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-gray-400">No hay movimientos en este período.</td>
                                    </tr>
                                ) : (
                                    movimientos.map((mov) => {
                                        const isIngreso = mov.tipo_comprobante === "Ingreso";
                                        return (
                                            <tr key={mov.id} className="hover:bg-slate-50">
                                                <td className="px-4 py-4">{formatDate(mov.fecha)}</td>
                                                <td className="px-4 py-4">
                                                    <span className={`inline-block text-xs font-semibold px-2 py-1 rounded ${isIngreso ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                                                        {mov.comprobante}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4">{mov.entidad}</td>
                                                <td className="px-4 py-4 text-right font-medium text-green-600">
                                                    {isIngreso ? formatCurrency(mov.monto) : <span className="text-gray-300 font-normal">-</span>}
                                                </td>
                                                <td className="px-4 py-4 text-right font-medium text-red-600">
                                                    {!isIngreso ? formatCurrency(mov.monto) : <span className="text-gray-300 font-normal">-</span>}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
