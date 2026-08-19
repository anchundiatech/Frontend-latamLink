import { PublicKey } from "@solana/web3.js";
import { createHash } from "node:crypto";

/**
 * Evento `PaymentProcessed` del contrato.
 *
 * Anchor lo emite en los logs como `Program data: <base64>`, con 8 bytes de
 * discriminador y el resto serializado en Borsh. Decodificarlo es lo que
 * permite enterarse de un cobro que no pasó por nuestro backend — por ejemplo
 * el que hace la billetera del cliente al escanear el QR.
 */
export interface PaymentProcessedEvent {
  merchant: PublicKey;
  payer: PublicKey;
  posTerminalId: string;
  amount: bigint;
  posFee: bigint;
  gasFee: bigint;
  dust: bigint;
  splitAmounts: bigint[];
  timestamp: bigint;
}

export const PAYMENT_PROCESSED_DISCRIMINATOR = createHash("sha256")
  .update("event:PaymentProcessed")
  .digest()
  .subarray(0, 8);

const PREFIJO_DE_LOG = "Program data: ";

/** Decodifica el evento, o `null` si esa línea no es este evento. */
export function decodePaymentProcessed(base64: string): PaymentProcessedEvent | null {
  let data: Buffer;
  try {
    data = Buffer.from(base64, "base64");
  } catch {
    return null;
  }

  if (data.length < 8 || !data.subarray(0, 8).equals(PAYMENT_PROCESSED_DISCRIMINATOR)) {
    return null;
  }

  // Lecturas acotadas: un log recortado no debe tumbar el proceso.
  const need = (offset: number, bytes: number): void => {
    if (offset + bytes > data.length) throw new Error("Evento PaymentProcessed truncado");
  };

  let o = 8;
  need(o, 64);
  const merchant = new PublicKey(data.subarray(o, o + 32));
  o += 32;
  const payer = new PublicKey(data.subarray(o, o + 32));
  o += 32;

  need(o, 4);
  const terminalLen = data.readUInt32LE(o);
  o += 4;
  need(o, terminalLen);
  const posTerminalId = data.subarray(o, o + terminalLen).toString("utf8");
  o += terminalLen;

  need(o, 32);
  const amount = data.readBigUInt64LE(o);
  o += 8;
  const posFee = data.readBigUInt64LE(o);
  o += 8;
  const gasFee = data.readBigUInt64LE(o);
  o += 8;
  const dust = data.readBigUInt64LE(o);
  o += 8;

  need(o, 4);
  const splitCount = data.readUInt32LE(o);
  o += 4;
  need(o, splitCount * 8);
  const splitAmounts: bigint[] = [];
  for (let i = 0; i < splitCount; i++) {
    splitAmounts.push(data.readBigUInt64LE(o));
    o += 8;
  }

  need(o, 8);
  const timestamp = data.readBigInt64LE(o);

  return { merchant, payer, posTerminalId, amount, posFee, gasFee, dust, splitAmounts, timestamp };
}

/** Extrae los eventos de este tipo de los logs de una transacción. */
export function extractPaymentEvents(logs: string[]): PaymentProcessedEvent[] {
  const eventos: PaymentProcessedEvent[] = [];
  for (const log of logs) {
    if (!log.startsWith(PREFIJO_DE_LOG)) continue;
    try {
      const evento = decodePaymentProcessed(log.slice(PREFIJO_DE_LOG.length).trim());
      if (evento) eventos.push(evento);
    } catch (err) {
      console.error("Evento PaymentProcessed ilegible:", (err as Error).message);
    }
  }
  return eventos;
}
