import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SyB Servicios",
  description: "Sistema de Gestión",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        {/* Traemos los íconos de FontAwesome que usaste en tu diseño */}
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
      </head>
      <body className={`${inter.className} bg-slate-50 font-sans text-slate-900`}>

        <div className="flex h-screen overflow-hidden">
          {/* BARRA LATERAL */}
          <aside className="w-64 bg-slate-900 text-white shrink-0 flex flex-col z-10 shadow-2xl">
            <div className="p-6">
              <h1 className="text-xl font-black border-b border-slate-800 pb-4 text-blue-500 tracking-tighter">
                SyB SERVICIOS
              </h1>
            </div>
            <nav className="mt-2 flex-1 space-y-1">
              <Link href="/" className="flex items-center py-3 px-6 hover:bg-slate-800 hover:text-blue-400 transition-all duration-200 group">
                <i className="fas fa-chart-line mr-3 w-5 text-center text-slate-500 group-hover:text-blue-400"></i> 
                <span className="font-medium">Dashboard</span>
              </Link>
              <Link href="/clientes" className="flex items-center py-3 px-6 hover:bg-slate-800 hover:text-blue-400 transition-all duration-200 group">
                <i className="fas fa-users mr-3 w-5 text-center text-slate-500 group-hover:text-blue-400"></i>
                <span className="font-medium">Clientes</span>
              </Link>
              <Link href="/insumos" className="flex items-center py-3 px-6 hover:bg-slate-800 hover:text-blue-400 transition-all duration-200 group">
                <i className="fas fa-box-open mr-3 w-5 text-center text-slate-500 group-hover:text-blue-400"></i>
                <span className="font-medium">Insumos</span>
              </Link>
              <Link href="/proveedores" className="flex items-center py-3 px-6 hover:bg-slate-800 hover:text-blue-400 transition-all duration-200 group">
                <i className="fas fa-truck mr-3 w-5 text-center text-slate-500 group-hover:text-blue-400"></i>
                <span className="font-medium">Proveedores</span>
              </Link>
              <Link href="/servicios" className="flex items-center py-3 px-6 hover:bg-slate-800 hover:text-blue-400 transition-all duration-200 group">
                <i className="fas fa-wrench mr-3 w-5 text-center text-slate-500 group-hover:text-blue-400"></i>
                <span className="font-medium">Servicios</span>
              </Link>
              <Link href="/ordenes" className="flex items-center py-3 px-6 hover:bg-slate-800 hover:text-blue-400 transition-all duration-200 group">
                <i className="fas fa-clipboard-list mr-3 w-5 text-center text-slate-500 group-hover:text-blue-400"></i>
                <span className="font-medium">Órdenes</span>
              </Link>
              <Link href="/presupuestos" className="flex items-center py-3 px-6 hover:bg-slate-800 hover:text-blue-400 transition-all duration-200 group">
                <i className="fas fa-file-signature mr-3 w-5 text-center text-slate-500 group-hover:text-blue-400"></i>
                <span className="font-medium">Presupuestos</span>
              </Link>
              <Link href="/facturacion" className="flex items-center py-3 px-6 hover:bg-slate-800 hover:text-blue-400 transition-all duration-200 group">
                <i className="fas fa-file-invoice-dollar mr-3 w-5 text-center text-slate-500 group-hover:text-blue-400"></i>
                <span className="font-medium">Facturación</span>
              </Link>
              <Link href="/cobros" className="flex items-center py-3 px-6 hover:bg-slate-800 hover:text-blue-400 transition-all duration-200 group">
                <i className="fas fa-hand-holding-dollar mr-3 w-5 text-center text-slate-500 group-hover:text-blue-400"></i>
                <span className="font-medium">Cobros</span>
              </Link>
              <Link href="/reportes" className="flex items-center py-3 px-6 hover:bg-slate-800 hover:text-blue-400 transition-all duration-200 group">
                <i className="fas fa-chart-pie mr-3 w-5 text-center text-slate-500 group-hover:text-blue-400"></i>
                <span className="font-medium">Reportes</span>
              </Link>
            </nav>
          </aside>

          {/* ÁREA DE CONTENIDO PRINCIPAL */}
          <main className="flex-1 overflow-y-auto p-10 bg-slate-50">
            {children}
          </main>

        </div>
      </body>
    </html>
  );
}