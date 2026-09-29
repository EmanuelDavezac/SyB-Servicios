import { obtenerUsuarioSesion } from "@/lib/sesion";
import Sidebar from "@/components/Sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await obtenerUsuarioSesion();

  return (
    <div className="flex h-dvh overflow-hidden print:h-auto print:overflow-visible print:block">
      <Sidebar nombre={usuario?.nombre ?? ""} />

      {/* ÁREA DE CONTENIDO PRINCIPAL */}
      <main className="flex-1 overflow-y-auto p-4 pt-[4.5rem] lg:p-10 bg-slate-50 print:p-0 print:pt-0 print:bg-white print:overflow-visible print:h-auto print:block">
        {children}
      </main>
    </div>
  );
}
