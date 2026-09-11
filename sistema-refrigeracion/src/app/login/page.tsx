import BotonLoginGoogle from "@/components/BotonLoginGoogle";

const MENSAJES_ERROR: Record<string, string> = {
  email_no_autorizado: "Tu cuenta de Google no está autorizada para acceder a este sistema.",
  usuario_no_autorizado: "Tu cuenta ya no tiene acceso al sistema.",
  email_requerido: "No pudimos obtener un email de tu cuenta de Google.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; error_description?: string }>;
}) {
  const { error, error_description } = await searchParams;
  const mensaje = error
    ? (error_description || MENSAJES_ERROR[error] || "No se pudo iniciar sesión. Intentá de nuevo.")
    : null;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 sm:p-8">
        <h1 className="text-xl font-black text-blue-500 tracking-tighter text-center">
          SyB SERVICIOS
        </h1>
        <p className="mt-1 text-sm text-slate-500 text-center">
          Sistema de gestión interno
        </p>

        {mensaje && (
          <div className="mt-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {mensaje}
          </div>
        )}

        <div className="mt-6">
          <BotonLoginGoogle />
        </div>
      </div>
    </div>
  );
}
