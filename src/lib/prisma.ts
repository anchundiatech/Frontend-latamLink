import { PrismaClient } from '@prisma/client';

// Una sola instancia para todo el proceso. Con un PrismaClient por módulo se
// abría un pool de conexiones por archivo, y en desarrollo el hot reload los
// iba acumulando hasta agotar las conexiones de PostgreSQL.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Serializa objetos con BigInt (montos y comisiones) para poder devolverlos
 * como JSON.
 */
export const serializeBigInt = (data: unknown) =>
  JSON.parse(
    JSON.stringify(data, (_key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
