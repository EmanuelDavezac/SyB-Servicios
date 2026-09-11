import { obtenerUsuarioSesion } from "@/lib/sesion";
import Sidebar from "@/components/Sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await obtenerUsuarioSesion();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar nombre={usuario?.nombre ?? ""} />

      <main className="flex-1 overflow-y-auto p-6 pt-20 md:p-10 bg-slate-50">
        {children}
      </main>
    </div>
  );
}
