import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { customSession } from "better-auth/plugins/custom-session";
import { prisma } from "./prisma";

// La lista blanca se revalida en dos puntos, ambos contra la misma tabla
// usuario_autorizado:
// 1. user.validateUserInfo corre en cada intento de login con Google (create
//    y sign-in), antes de que exista sesion. Rechaza con un error legible que
//    Better Auth redirige a onAPIError.errorURL como query params.
// 2. El plugin customSession corre en cada llamada a auth.api.getSession
//    (proxy.ts y src/lib/sesion.ts la invocan en cada pedido, sin cookie
//    cache), asi que si alguien desactiva a un usuario, su proxima accion
//    lo saca aunque la cookie de sesion siga siendo valida.
async function buscarUsuarioAutorizado(email: string) {
  return prisma.usuario_autorizado.findUnique({
    where: { email: email.toLowerCase() },
  });
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  user: {
    async validateUserInfo(data) {
      if (data.source.method !== "oauth") return { error: "metodo_no_soportado" };
      const email = data.user.email;
      if (!email) return { error: "email_requerido" };
      const autorizado = await buscarUsuarioAutorizado(email);
      if (!autorizado || !autorizado.activo) {
        return {
          error: "email_no_autorizado",
          errorDescription: "Tu cuenta de Google no esta autorizada para acceder a este sistema.",
        };
      }
    },
  },
  onAPIError: {
    errorURL: "/login",
  },
  plugins: [
    customSession(async ({ user, session }) => {
      const autorizado = await buscarUsuarioAutorizado(user.email);
      if (!autorizado || !autorizado.activo) {
        throw new APIError("UNAUTHORIZED", {
          code: "usuario_no_autorizado",
          message: "Tu cuenta ya no tiene acceso al sistema.",
        });
      }
      return {
        session,
        user: {
          ...user,
          rol: autorizado.rol,
          nombre: autorizado.nombre,
        },
      };
    }),
    // nextCookies debe ir ultimo: parchea las server actions de auth para que
    // usen las cookies del request de Next en vez de devolver Set-Cookie.
    nextCookies(),
  ],
});
