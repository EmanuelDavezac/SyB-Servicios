"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

const ITEMS_NAV = [
  { href: "/", icono: "fa-chart-line", label: "Dashboard" },
  { href: "/clientes", icono: "fa-users", label: "Clientes" },
  { href: "/insumos", icono: "fa-box-open", label: "Insumos" },
  { href: "/proveedores", icono: "fa-truck", label: "Proveedores" },
  { href: "/compras", icono: "fa-cart-shopping", label: "Compras" },
  { href: "/servicios", icono: "fa-wrench", label: "Servicios" },
  { href: "/ordenes", icono: "fa-clipboard-list", label: "Órdenes" },
  { href: "/presupuestos", icono: "fa-file-signature", label: "Presupuestos" },
  { href: "/facturacion", icono: "fa-file-invoice-dollar", label: "Facturación" },
  { href: "/informes-tecnicos", icono: "fa-file-lines", label: "Informe Técnico" },
  { href: "/cobros", icono: "fa-hand-holding-dollar", label: "Cobros" },
  { href: "/reportes", icono: "fa-chart-pie", label: "Reportes" },
];

export default function Sidebar({
  nombre,
}: {
  nombre: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const router = useRouter();

  async function cerrarSesion() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Botón hamburguesa, solo visible en mobile */}
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="md:hidden fixed top-4 left-4 z-30 h-10 w-10 flex items-center justify-center rounded-lg bg-slate-900 text-white shadow-lg"
        aria-label="Abrir menú"
      >
        <i className="fas fa-bars"></i>
      </button>

      {/* Fondo oscuro al abrir el panel en mobile */}
      {abierto && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setAbierto(false)}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white shrink-0 flex flex-col shadow-2xl transform transition-transform duration-200 ease-in-out
        ${abierto ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
      >
        <div className="p-6 flex items-center justify-between">
          <h1 className="text-xl font-black border-b border-slate-800 pb-4 text-blue-500 tracking-tighter">
            SyB SERVICIOS
          </h1>
          <button
            type="button"
            onClick={() => setAbierto(false)}
            className="md:hidden text-slate-400 hover:text-white"
            aria-label="Cerrar menú"
          >
            <i className="fas fa-xmark"></i>
          </button>
        </div>

        <nav className="mt-2 flex-1 space-y-1 overflow-y-auto">
          {ITEMS_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setAbierto(false)}
              className="flex items-center py-3 px-6 hover:bg-slate-800 hover:text-blue-400 transition-all duration-200 group"
            >
              <i className={`fas ${item.icono} mr-3 w-5 text-center text-slate-500 group-hover:text-blue-400`}></i>
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <p className="text-sm font-medium truncate" title={nombre}>{nombre}</p>
          <button
            type="button"
            onClick={cerrarSesion}
            className="mt-2 w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-all duration-200"
          >
            <i className="fas fa-right-from-bracket"></i>
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
