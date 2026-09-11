import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Chequeo optimista: solo mira si existe la cookie de sesion, sin pegarle a
// la base. La validacion autoritativa (sesion valida + usuario_autorizado
// activo) corre en src/lib/sesion.ts al principio de cada server action que
// escribe datos, que es donde de verdad importa (una action se puede invocar
// por HTTP sin pasar por ac). Este proxy solo evita que alguien sin cookie
// navegue a una pantalla protegida.
const RUTAS_PUBLICAS = ["/login"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname === "/api/cron/recordatorios" ||
    pathname.startsWith("/api/auth") ||
    RUTAS_PUBLICAS.includes(pathname)
  ) {
    return NextResponse.next();
  }

  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
