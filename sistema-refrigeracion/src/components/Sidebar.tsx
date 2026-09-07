"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const LINKS = [
  { href: "/", icon: "fa-chart-line", label: "Dashboard" },
  { href: "/clientes", icon: "fa-users", label: "Clientes" },
  { href: "/insumos", icon: "fa-box-open", label: "Insumos" },
  { href: "/proveedores", icon: "fa-truck", label: "Proveedores" },
  { href: "/compras", icon: "fa-cart-shopping", label: "Compras" },
  { href: "/servicios", icon: "fa-wrench", label: "Servicios" },
  { href: "/ordenes", icon: "fa-clipboard-list", label: "Órdenes" },
  { href: "/presupuestos", icon: "fa-file-signature", label: "Presupuestos" },
  { href: "/facturacion", icon: "fa-file-invoice-dollar", label: "Facturación" },
  { href: "/informes-tecnicos", icon: "fa-file-lines", label: "Informe Técnico" },
  { href: "/cobros", icon: "fa-hand-holding-dollar", label: "Cobros" },
  { href: "/reportes", icon: "fa-chart-pie", label: "Reportes" },
];

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const scrollEl = document.querySelector("main");
    const prevOverflow = scrollEl?.style.overflow ?? "";
    if (scrollEl) scrollEl.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      if (scrollEl) scrollEl.style.overflow = prevOverflow;
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      {/* BARRA SUPERIOR MÓVIL */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-slate-900 text-white flex items-center px-4 z-30 shadow-lg">
        <button
          type="button"
          aria-label="Abrir menú"
          onClick={() => setOpen(true)}
          className="w-11 h-11 -ml-2 flex items-center justify-center text-xl"
        >
          <i className="fas fa-bars"></i>
        </button>
        <h1 className="ml-2 text-lg font-black text-blue-500 tracking-tighter">
          SyB SERVICIOS
        </h1>
      </header>

      {/* CAPA OSCURA */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* BARRA LATERAL */}
      <aside
        className={`
          fixed lg:static top-0 left-0 h-dvh w-64 bg-slate-900 text-white shrink-0 flex flex-col z-50 shadow-2xl
          transition-transform duration-200 ease-in-out
          ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0
        `}
      >
        <div className="p-6">
          <h1 className="text-xl font-black border-b border-slate-800 pb-4 text-blue-500 tracking-tighter">
            SyB SERVICIOS
          </h1>
        </div>
        <nav className="mt-2 flex-1 space-y-1 overflow-y-auto">
          {LINKS.map(({ href, icon, label }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center min-h-[44px] py-3 px-6 hover:bg-slate-800 hover:text-blue-400 transition-all duration-200 group"
            >
              <i className={`fas ${icon} mr-3 w-5 text-center text-slate-500 group-hover:text-blue-400`}></i>
              <span className="font-medium">{label}</span>
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}
