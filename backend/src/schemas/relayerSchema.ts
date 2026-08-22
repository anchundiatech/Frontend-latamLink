import { z } from "zod";

// Los montos on-chain llegan como string o number pero viajan como BigInt de
// ahí en más (invariante financiera: nunca number de punto flotante para
// cantidades on-chain). Rechazar acá <= 0 cierra la invariante "amount > 0"
// en el límite de confianza, en vez de dejar que BigInt(amount) explote más
// adelante con un mensaje genérico.
const amountToBigInt = z
  .union([z.string(), z.number()])
  .transform((val, ctx) => {
    try {
      return BigInt(val);
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "amount no es un entero válido" });
      return z.NEVER;
    }
  })
  .refine((val) => val > 0n, { message: "amount debe ser mayor que 0" });

const pubkeyString = z.string().min(32, "Se esperaba una dirección Solana válida");

export const createMerchantSchema = z.object({
  paymentTokenMint: pubkeyString,
  destinations: z.array(pubkeyString).min(1).max(10),
  percentages: z.array(z.number().int().min(0).max(100)).min(1).max(10),
  posTerminalId: z.string().min(1).max(32),
  feeBps: z.number().int().min(0).max(10_000),
  posFeeBps: z.number().int().min(0).max(10_000),
  minPaymentAmount: z.union([z.string(), z.number()]),
});

export const updateMerchantConfigSchema = z.object({
  destinations: z.array(pubkeyString).min(1).max(10),
  percentages: z.array(z.number().int().min(0).max(100)).min(1).max(10),
  feeBps: z.number().int().min(0).max(10_000),
  posFeeBps: z.number().int().min(0).max(10_000),
  minPaymentAmount: z.union([z.string(), z.number()]),
});

export const buildPaymentSchema = z.object({
  merchantAddress: pubkeyString,
  payerPubkey: pubkeyString,
  amount: amountToBigInt,
  idempotencyKey: z.string().min(1).optional(),
});

export const solanaPaySchema = z.object({
  merchantAddress: pubkeyString,
  payerPubkey: pubkeyString,
  amount: amountToBigInt,
  reference: z.string().optional(),
});

export const submitPaymentSchema = z.object({
  transaction: z.string().min(1, "transaction (base64) es requerida"),
  reference: z.string().optional(),
});

export const payoutBuildSchema = z.object({
  ownerPubkey: pubkeyString,
  mint: pubkeyString,
  destination: pubkeyString,
  amount: amountToBigInt,
  decimals: z.number().int().min(0).max(18),
});

export const payoutSubmitSchema = z.object({
  transaction: z.string().min(1, "transaction (base64) es requerida"),
});

// GET /payments: los query params siempre llegan como string en Express, así
// que `limit` se convierte acá en vez de en el handler.
export const listPaymentsQuerySchema = z.object({
  merchant: z.string().optional(),
  reference: z.string().optional(),
  limit: z
    .string()
    .optional()
    .transform((val) => (val === undefined ? undefined : Number(val))),
});
