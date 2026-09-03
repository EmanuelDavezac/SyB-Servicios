import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined };

// DATABASE_ADAPTER=pg fuerza el driver adapter estandar (node-postgres), para
// correr contra el Postgres local de tests/integration. El adapter de Neon
// (WebSocket) no sirve contra un Postgres comun. Sin esta variable, el
// comportamiento de produccion contra Neon queda identico a como estaba.
// @prisma/adapter-pg es devDependency (solo la usan los tests): el import es
// dinamico y condicional para que el bundle de produccion nunca la cargue ni
// la ejecute. En produccion esta rama nunca corre, asi que el import()
// tampoco.
const PrismaPg = process.env.DATABASE_ADAPTER === "pg"
    ? (await import('@prisma/adapter-pg')).PrismaPg
    : undefined;

function getClient(): PrismaClient {
    if (!globalForPrisma.prisma) {
        const adapter = PrismaPg
            ? new PrismaPg(process.env.DATABASE_URL as string)
            : new PrismaNeon({ connectionString: process.env.DATABASE_URL });
        globalForPrisma.prisma = new PrismaClient({ adapter });
    }
    return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
    get(_target, prop) {
        return (getClient() as unknown as Record<string | symbol, unknown>)[prop];
    },
});
