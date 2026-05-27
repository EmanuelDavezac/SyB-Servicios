import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SyB Servicios",
  description: "Sistema de Gestión para Refrigeración",
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
      <body className={`${inter.className} bg-gray-100 font-sans text-black`}>

        <div className="flex h-screen overflow-hidden">
          {/* BARRA LATERAL (Extraída de tu HTML) */}
          <aside className="w-64 bg-slate-800 text-white flex-shrink-0 flex flex-col z-10">
            <div className="p-6">
              <h1 className="text-xl font-bold border-b border-slate-700 pb-4 text-sky-400">
                SyB Servicios
              </h1>
            </div>
            <nav className="mt-2 flex-1">
              <Link href="/" className="flex items-center py-3 px-6 hover:bg-slate-700 transition duration-200">
                <i className="fas fa-chart-line mr-3 w-5 text-center"></i> Dashboard
              </Link>
              <Link href="/clientes" className="flex items-center py-3 px-6 hover:bg-slate-700 transition duration-200">
                <i className="fas fa-users mr-3 w-5 text-center"></i> Clientes
              </Link>
              <Link href="/insumos" className="flex items-center py-3 px-6 hover:bg-slate-700 transition duration-200">
                <i className="fas fa-box-open mr-3 w-5 text-center"></i> Insumos
              </Link>
              <Link href="/ordenes" className="flex items-center py-3 px-6 hover:bg-slate-700 transition duration-200">
                <i className="fas fa-clipboard-list mr-3 w-5 text-center"></i> Órdenes
              </Link>
              <Link href="/facturacion" className="flex items-center py-3 px-6 hover:bg-slate-700 transition duration-200">
                <i className="fas fa-file-invoice-dollar mr-3 w-5 text-center"></i> Facturación
              </Link>
              <Link href="/reportes" className="flex items-center py-3 px-6 hover:bg-slate-700 transition duration-200">
                <i className="fas fa-chart-pie mr-3 w-5 text-center"></i> Reportes
              </Link>
            </nav>
            <div className="p-4 text-xs text-slate-500 border-t border-slate-700">
              Itec - Prácticas Prof. I
            </div>
          </aside>

          {/* ÁREA DE CONTENIDO PRINCIPAL */}
          {/* 'children' es la página actual (ej: page.tsx o clientes/page.tsx) */}
          <main className="flex-1 overflow-y-auto p-8 relative">
            {children}
          </main>

        </div>
      </body>
    </html>
  );
}