import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "./auth";

export type UsuarioSesion = {
  id: string;
  email: string;
  nombre: string;
  rol: string;
};

// El proxy (proxy.ts) ya corta la navegacion sin sesion, pero una server
// action se puede invocar directamente por HTTP sin pasar por el proxy. Esta
// funcion es el punto que valida eso: se llama al principio de toda action
// que escribe datos.
//
// auth.api.getSession corre el plugin customSession (src/lib/auth.ts) en
// cada llamada, sin cookie cache, asi que ademas de validar la sesion
// revalida en la tabla usuario_autorizado en cada pedido: un usuario
// desactivado queda afuera en su proxima accion.
//
// En los tests de integracion este modulo se reemplaza por completo
// (vi.mock en tests/integration/setup.ts, igual que next/cache) porque las
// actions se invocan sin sesion real ni request de Next detras.
//
// cache() de React la memoiza durante un mismo request: el layout, la pagina y
// la action que corren juntos comparten una sola consulta de sesion (2 queries
// a la base) en vez de repetirla en cada uno. No cruza requests, asi que la
// revalidacion de usuario_autorizado en cada pedido se mantiene.
export const obtenerUsuarioSesion = cache(async (): Promise<UsuarioSesion | null> => {
  try {
    const data = await auth.api.getSession({ headers: await headers() });
    if (!data) return null;
    const { id, email, nombre, rol } = data.user;
    return { id, email, nombre, rol };
  } catch {
    return null;
  }
});

export async function requerirUsuario(): Promise<UsuarioSesion> {
  const usuario = await obtenerUsuarioSesion();
  if (!usuario) {
    throw new Error("No autorizado: se requiere iniciar sesion.");
  }
  return usuario;
}
