import { afterAll, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { assertTestDatabaseUrl } from "./testDb";

// Las actions llaman revalidatePath como efecto de cache de Next.js. Fuera de
// un request real de Next (que es como corren estos tests) esa llamada tira
// "Invariant: static generation store missing". No es logica de negocio ni
// la base de datos, es infraestructura de framework ajena a lo que se
// prueba, asi que se stubea.
vi.mock("next/cache", () => ({
  revalidatePath: () => {},
}));

// Las actions llaman a requerirUsuario() (src/lib/sesion.ts) al principio de
// toda escritura para exigir sesion. Estos tests invocan las actions
// directamente, sin request de Next detras y sin cookie de sesion real, asi
// que auth.api.getSession (que necesita next/headers) no tiene de donde leer
// nada. Se simula la sesion devuelta -un usuario ya autorizado-, no el
// control: la funcion real de la action sigue llamando a requerirUsuario, asi
// que un cambio que la borre rompe la suite igual que borrar la revalidacion.
vi.mock("@/lib/sesion", () => ({
  requerirUsuario: async () => ({
    id: "test-user-id",
    email: "test@syb-servicios.local",
    nombre: "Usuario de Test",
    rol: "administrador",
  }),
  obtenerUsuarioSesion: async () => ({
    id: "test-user-id",
    email: "test@syb-servicios.local",
    nombre: "Usuario de Test",
    rol: "administrador",
  }),
}));

// DATABASE_URL/DATABASE_ADAPTER ya vienen seteadas por vitest.config.ts
// (campo test.env), asignadas a process.env antes de que este archivo o
// cualquier modulo de la app se importen. Aca solo se valida.
assertTestDatabaseUrl(process.env.DATABASE_URL);

// Todas las tablas base de "public" salvo la de bookkeeping de Prisma. Se
// consulta en cada beforeEach en vez de hardcodear la lista: si se agrega un
// modelo/tabla al schema, este archivo no necesita tocarse para limpiarla.
async function obtenerTablas(): Promise<string[]> {
  const filas = await prisma.$queryRawUnsafe<{ table_name: string }[]>(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name <> '_prisma_migrations'`
  );
  return filas.map((f) => f.table_name);
}

// Aislamiento por truncate en vez de envolver cada test en una transaccion
// con rollback: varias actions (crearFactura, registrarCobro, crearCompra,
// crearPresupuesto) abren su propio prisma.$transaction internamente sobre
// el mismo cliente singleton. Envolver el test en una transaccion externa
// significaria anidar esa transaccion dentro de la del test, y el pool de
// conexiones de Prisma no garantiza que la transaccion interna de la action
// use la misma conexion que la transaccion externa del test (Prisma no
// soporta transacciones interactivas anidadas sobre el mismo client). El
// resultado seria un deadlock o, peor, un commit que escapa el rollback.
// Truncar todo antes de cada test es mas lento pero funciona igual sin
// importar cuantos niveles de $transaction use la action bajo prueba.
beforeEach(async () => {
  const tablas = await obtenerTablas();
  if (tablas.length === 0) return;
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${tablas.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`
  );
});

// Cierra la conexion (y el pool de pg subyacente cuando corresponde) al
// terminar los tests de este archivo, para que el proceso de Vitest no
// quede colgado esperando un socket abierto.
afterAll(async () => {
  await prisma.$disconnect();
});
