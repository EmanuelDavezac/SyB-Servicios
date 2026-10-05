import { config } from 'dotenv'
config({ path: '.env' })
config({ path: '.env.local' })

import { Pool } from '@neondatabase/serverless';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(`ALTER TABLE "detalle_compra" ALTER COLUMN "cantidad" TYPE DECIMAL(10,3);`);
    console.log("Columna alterada exitosamente a DECIMAL(10,3)");
  } catch (error) {
    console.error("Error al alterar la columna:", error);
  } finally {
    await pool.end();
  }
}
main();
