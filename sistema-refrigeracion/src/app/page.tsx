import Link from "next/link";
import { obtenerDatosDashboard } from "@/actions/reportes";

export default async function DashboardPage() {
  const { ordenesEnCurso, alertasStock, facturasPorVencer } = await obtenerDatosDashboard();

  const getDiasFaltantes = (fecha: string) => {
    const fv = new Date(fecha);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    fv.setHours(0, 0, 0, 0);
    const diff = fv.getTime() - hoy.getTime();
    return Math.ceil(diff / (1000 * 3600 * 24));
  };

  const getTextoVencimiento = (fecha: string) => {
    const dias = getDiasFaltantes(fecha);
    if (dias < 0) return { texto: "VENCIDA", clase: "text-red-600 font-bold" };
    if (dias === 0) return { texto: "Vence hoy", clase: "text-orange-600 font-bold" };
    if (dias === 1) return { texto: "Vence mañana", clase: "text-orange-500 font-medium" };
    return { texto: `Vence en ${dias} días`, clase: "text-gray-600" };
  };

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Panel Principal</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Cuadro 1: Trabajos en Curso */}
        <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-blue-500 flex flex-col h-full">
          <h3 className="text-lg font-semibold mb-4 text-blue-700">
            <i className="fas fa-tools mr-2"></i> Trabajos en Curso
          </h3>
          <ul className="space-y-3 flex-1">
            {ordenesEnCurso.length > 0 ? (
              ordenesEnCurso.map((o: any) => (
                <li key={o.id_orden} className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <span className="font-medium text-gray-700 truncate mr-2" title={`${o.cliente?.nombre} ${o.cliente?.apellido}`}>
                    {o.cliente?.nombre} {o.cliente?.apellido}
                  </span>
                  <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase whitespace-nowrap ${o.estado_trabajo === "Pendiente" ? "bg-gray-100 text-gray-800" : "bg-yellow-100 text-yellow-800"
                    }`}>
                    {o.estado_trabajo}
                  </span>
                </li>
              ))
            ) : (
              <p className="text-gray-400 text-sm">No hay trabajos pendientes.</p>
            )}
          </ul>
          <Link href="/ordenes?estado=En proceso" className="block w-full mt-4 text-sm text-blue-600 hover:text-blue-800 font-semibold text-right">
            Ver todas las órdenes &rarr;
          </Link>
        </div>

        {/* Cuadro 2: Alertas de Stock Bajo */}
        <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-orange-500 flex flex-col h-full">
          <h3 className="text-lg font-semibold mb-4 text-orange-700">
            <i className="fas fa-exclamation-triangle mr-2"></i> Alertas de Stock Bajo
          </h3>
          <ul className="space-y-3 flex-1">
            {alertasStock.length > 0 ? (
              alertasStock.map((i: any) => (
                <li key={i.id_insumo} className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <span className="text-gray-700 truncate mr-2" title={i.nombre}>{i.nombre}</span>
                  <span className="text-red-600 font-bold whitespace-nowrap">
                    {i.stock_actual} (Mín: {i.stock_minimo})
                  </span>
                </li>
              ))
            ) : (
              <p className="text-gray-400 text-sm">Todo el stock está al día.</p>
            )}
          </ul>
          <Link href="/insumos?stockBajo=1" className="block w-full mt-4 text-sm text-orange-600 hover:text-orange-800 font-semibold text-right">
            Revisar inventario &rarr;
          </Link>
        </div>

        {/* Cuadro 3: Facturas por Vencer */}
        <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-red-500 flex flex-col h-full">
          <h3 className="text-lg font-semibold mb-4 text-red-700">
            <i className="fas fa-clock mr-2"></i> Facturas por Vencer
          </h3>
          <ul className="space-y-3 flex-1">
            {facturasPorVencer.length > 0 ? (
              facturasPorVencer.map((f: any) => {
                const info = getTextoVencimiento(f.fecha_vencimiento);
                return (
                  <li key={f.id_factura} className="flex flex-col border-b border-gray-100 pb-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-700 truncate mr-1" title={`${f.orden_trabajo?.cliente?.nombre} ${f.orden_trabajo?.cliente?.apellido}`}>
                        {f.orden_trabajo?.cliente?.nombre} {f.orden_trabajo?.cliente?.apellido}
                      </span>
                      <span className="text-gray-800 font-bold text-sm">${Number(f.monto_total).toLocaleString()}</span>
                    </div>
                    <span className={`text-xs ${info.clase}`}>{info.texto}</span>
                  </li>
                );
              })
            ) : (
              <p className="text-gray-400 text-sm">No hay facturas pendientes de cobro.</p>
            )}
          </ul>
          <Link href="/facturacion" className="block w-full mt-4 text-sm text-red-600 hover:text-red-800 font-semibold text-right">
            Ver facturación &rarr;
          </Link>
        </div>

      </div>
    </div>
  );
}