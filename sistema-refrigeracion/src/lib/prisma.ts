// src/lib/prisma.ts (o lib/prisma.ts)
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        log: ['query'], // Opcional: te muestra en la terminal las consultas SQL que se ejecutan
    });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
