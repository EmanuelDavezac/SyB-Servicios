import { obtenerUsuarioSesion } from "@/lib/sesion";
import Sidebar from "@/components/Sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await obtenerUsuarioSesion();

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar nombre={usuario?.nombre ?? ""} />

      {/* ÁREA DE CONTENIDO PRINCIPAL */}
      <main className="flex-1 overflow-y-auto p-4 pt-[4.5rem] lg:p-10 bg-slate-50">
        {children}
      </main>
    </div>
  );
}
