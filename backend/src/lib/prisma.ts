// Import desde el output custom del generator (ver prisma/schema.prisma), no
// desde "@prisma/client": bajo pnpm ese paquete resuelve a un placeholder
// empaquetado que revienta en runtime en vez del cliente generado de verdad.
import { PrismaClient } from "../../generated/prisma/index.js";

export const prisma = new PrismaClient();

/**
 * JSON.stringify no serializa BigInt (TypeError) y los montos on-chain de
 * Prisma son BigInt (invariante financiera 5: nunca `number`). Se convierten
 * a string recursivamente justo antes de responder, nunca antes.
 */
export function serializeBigInt<T>(value: T): T {
  if (typeof value === "bigint") {
    return value.toString() as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => serializeBigInt(item)) as unknown as T;
  }
  // Object.entries(new Date()) es [] (el valor no vive en propiedades
  // enumerables): sin este caso, cualquier campo DateTime de Prisma
  // (timestamp, createdAt...) se convertía en `{}` y el frontend recibía una
  // fecha inválida.
  if (value instanceof Date) {
    return value.toISOString() as unknown as T;
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = serializeBigInt(val);
    }
    return result as T;
  }
  return value;
}
