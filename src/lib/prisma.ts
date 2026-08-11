import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined };

function getClient(): PrismaClient {
    if (!globalForPrisma.prisma) {
        const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
        globalForPrisma.prisma = new PrismaClient({ adapter });
    }
    return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
    get(_target, prop) {
        return (getClient() as unknown as Record<string | symbol, unknown>)[prop];
    },
});
