import path from "node:path";
import { defineConfig } from "vitest/config";
import { TEST_DATABASE_URL, TEST_DATABASE_ADAPTER } from "./tests/integration/testDb";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/actions/**"],
    },
    // Global (no es un ajuste por-proyecto: ProjectConfig no admite
    // fileParallelism/poolOptions). Serializa tambien "unit", que es
    // suficientemente chico como para que no importe.
    fileParallelism: false,
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.ts"],
          // Seteado aca (no en setup.ts) porque Vitest asigna esto a
          // process.env antes de cargar setupFiles y los archivos de test,
          // asi que src/lib/prisma.ts ve la variable desde su primera
          // evaluacion, sin depender de que su singleton sea lazy.
          env: {
            DATABASE_URL: TEST_DATABASE_URL,
            DATABASE_ADAPTER: TEST_DATABASE_ADAPTER,
          },
          setupFiles: ["tests/integration/setup.ts"],
          globalSetup: ["tests/integration/globalSetup.ts"],
        },
      },
    ],
  },
});
