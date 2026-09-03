export const TEST_DATABASE_URL =
  "postgresql://test:test@localhost:55432/sistema_refrigeracion_test?sslmode=disable";
export const TEST_DATABASE_ADAPTER = "pg";

const TEST_HOST_PORT = "localhost:55432";
const TEST_DB_NAME = "sistema_refrigeracion_test";

// Guard de seguridad: los tests de integracion truncan tablas y corren
// migraciones. Si por error apuntaran a Neon (produccion), esto seria
// destructivo. Se valida contra un allowlist del host/puerto/nombre de la
// base de test conocida, no contra un blocklist de "no es Neon".
export function assertTestDatabaseUrl(url: string | undefined): void {
  if (!url || !url.includes(TEST_HOST_PORT) || !url.includes(TEST_DB_NAME)) {
    throw new Error(
      `Tests de integracion abortados: la URL de conexion no apunta a la base de test ` +
      `(se espera host "${TEST_HOST_PORT}" y base "${TEST_DB_NAME}"). ` +
      `Valor recibido: ${url ?? "(sin definir)"}`
    );
  }
}
