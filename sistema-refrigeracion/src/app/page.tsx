import Link from "next/link";

export default function DashboardPage() {
  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Panel Principal</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Cuadro 1: Trabajos en Curso */}
        <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-blue-500">
          <h3 className="text-lg font-semibold mb-4 text-blue-700">
            <i className="fas fa-tools mr-2"></i> Trabajos en Curso
          </h3>
          <ul className="space-y-3">
            <li className="flex justify-between items-center border-b border-gray-100 pb-2">
              <span className="font-medium text-gray-700">Carlos Gómez</span>
              <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded font-bold">EN PROCESO</span>
            </li>
            <li className="flex justify-between items-center border-b border-gray-100 pb-2">
              <span className="font-medium text-gray-700">Heladería Glaciar</span>
              <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded font-bold">PENDIENTE</span>
            </li>
          </ul>
          {/* Reemplazamos el onclick de tu HTML por un Link de Next.js */}
          <Link href="/ordenes" className="block w-full mt-4 text-sm text-blue-600 hover:text-blue-800 font-semibold text-right">
            Ver todas las órdenes &rarr;
          </Link>
        </div>

        {/* Cuadro 2: Alertas de Stock Bajo */}
        <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-orange-500">
          <h3 className="text-lg font-semibold mb-4 text-orange-700">
            <i className="fas fa-exclamation-triangle mr-2"></i> Alertas de Stock Bajo
          </h3>
          <ul className="space-y-3">
            <li className="flex justify-between items-center border-b border-gray-100 pb-2">
              <span className="text-gray-700">Caño Cobre 1/4</span>
              <span className="text-red-600 font-bold">3m (Mín: 15m)</span>
            </li>
            <li className="flex justify-between items-center border-b border-gray-100 pb-2">
              <span className="text-gray-700">Capacitor 35uf</span>
              <span className="text-red-600 font-bold">1 unid (Mín: 5)</span>
            </li>
          </ul>
        </div>

        {/* Cuadro 3: Facturas por Vencer */}
        <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-red-500">
          <h3 className="text-lg font-semibold mb-4 text-red-700">
            <i className="fas fa-clock mr-2"></i> Facturas por Vencer
          </h3>
          <ul className="space-y-3">
            <li className="flex justify-between items-center border-b border-gray-100 pb-2 text-red-600 font-semibold">
              <span>Cliente: Heladería Glaciar</span>
              <span>VENCIDA ($120.000)</span>
            </li>
            <li className="flex justify-between items-center border-b border-gray-100 pb-2">
              <span className="text-gray-700">Cliente: Supermercado Día</span>
              <span className="text-orange-600 font-medium">Vence mañana</span>
            </li>
            <li className="flex justify-between items-center border-b border-gray-100 pb-2">
              <span className="text-gray-700">Cliente: Juan Pérez</span>
              <span className="text-gray-600">Vence en 5 días</span>
            </li>
          </ul>
        </div>

      </div>
    </div>
  );
}