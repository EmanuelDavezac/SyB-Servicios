import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

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
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Traemos los íconos de FontAwesome que usaste en tu diseño */}
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
      </head>
      <body className={`${inter.className} bg-slate-50 font-sans text-slate-900`}>

        <div className="flex h-dvh overflow-hidden">
          <Sidebar />

          {/* ÁREA DE CONTENIDO PRINCIPAL */}
          <main className="flex-1 overflow-y-auto p-4 pt-[4.5rem] lg:p-10 bg-slate-50">
            {children}
          </main>

        </div>
      </body>
    </html>
  );
}