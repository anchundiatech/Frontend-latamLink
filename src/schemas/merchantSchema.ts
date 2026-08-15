import { z } from 'zod';

// Esquema para MerchantOwner: Todo es obligatorio según tu schema.prisma
export const createMerchantOwnerSchema = z.object({
  pubkey: z.string().min(32, "La pubkey debe tener al menos 32 caracteres"),
  email: z.string().email("Formato de email inválido").optional(), // El ? en prisma lo hace opcional
  name: z.string().min(2, "El nombre es muy corto").optional(),    // El ? en prisma lo hace opcional
  embeddedWalletPda: z.string().min(32, "La PDA es inválida"),
});

// Esquema para Merchant: Obligatorios según schema.prisma (sin ?)
export const createMerchantSchema = z.object({
  merchantOwnerId: z.string().uuid("El ID del dueño debe ser un UUID válido"),
  merchantIdOnchain: z.string().transform((val) => BigInt(val)), // BigInt requiere transformación
  pdaAddress: z.string().min(32, "La PDA de dirección es inválida"),
  pdaPaymentVault: z.string().min(32, "La PDA del vault de pago es inválida"),
  pdaGasVault: z.string().min(32, "La PDA del vault de gas es inválida"),
  name: z.string().min(3, "El nombre del comercio es muy corto"),
  feeBps: z.number().int().default(0),
  posFeeBps: z.number().int().default(0),
  minPaymentAmount: z.string().transform((val) => BigInt(val)),
  isActive: z.boolean().default(true),
  totalVolume: z.string().transform((val) => BigInt(val)),
});

// Esquema para PosTerminal
export const createTerminalSchema = z.object({
  merchantId: z.string().uuid("El merchantId debe ser un UUID válido"),
  posTerminalId: z.string().max(32, "El ID de la terminal debe tener máx 32 caracteres"),
  isActive: z.boolean().default(true),
});

// Esquema para Payment
export const createPaymentSchema = z.object({
  txSignature: z.string().min(32, "Firma de transacción inválida"),
  merchantId: z.string().uuid("merchantId debe ser un UUID"),
  posTerminalId: z.string().uuid("posTerminalId debe ser un UUID"),
  payerPubkey: z.string().min(32, "Payer Pubkey inválida"),
  amountGross: z.string().transform((val) => BigInt(val)),
  posFee: z.string().transform((val) => BigInt(val)),
  gasFee: z.string().transform((val) => BigInt(val)),
  dust: z.string().transform((val) => BigInt(val)),
  timestamp: z.string().datetime("Formato de fecha inválido"),
  status: z.enum(['PENDING', 'CONFIRMED', 'FAILED']).default('PENDING'),
});

// Esquema para MerchantDestination
export const createDestinationSchema = z.object({
  merchantId: z.string().uuid(),
  destinationPubkey: z.string().min(1, "La pubkey de destino es obligatoria"),
  percentage: z.number().int().min(1).max(100),
  positionIndex: z.number().int().nonnegative(),
  isActive: z.boolean().optional().default(true),
  description: z.string().optional(),
});