import { execSync } from "node:child_process";
import { TEST_DATABASE_URL, assertTestDatabaseUrl } from "./testDb";

// Corre una sola vez antes de toda la corrida de tests de integration
// (proceso propio de Vitest, separado de los workers que ejecutan los
// tests). Aplica las migraciones sobre la base de test via `prisma migrate
// deploy`, nunca `db push` ni `migrate dev`.
export default function setup() {
  assertTestDatabaseUrl(TEST_DATABASE_URL);

  execSync("npx prisma migrate deploy", {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: "inherit",
  });
}
