import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { buscarComercioPorPda, registrarCobro } from "./catalogo.js";

/**
 * Registra en el historial un cobro que llegó como transferencia SPL directa
 * (sin pasar por el contrato): el escaneo de QR con la cámara de las wallets
 * no reconoce de forma confiable el patrón que sí ejecuta `pay()`, así que el
 * cliente le paga directo a la wallet del comercio. Nada de esto se confía
 * del navegador — se relee la transacción real de la red antes de registrar
 * nada, igual que hace el conciliador con los cobros del contrato.
 */
export async function conciliarTransferenciaDirecta(
  connection: Connection,
  params: { reference: string; merchantPda: string; ownerPubkey: string; mint: string },
): Promise<"registrado" | "ya-estaba" | "sin-comercio" | "sin-transaccion" | "monto-invalido"> {
  const referencia = new PublicKey(params.reference);
  const firmas = await connection.getSignaturesForAddress(referencia, { limit: 1 }, "confirmed");
  if (!firmas.length || firmas[0]!.err) return "sin-transaccion";
  const signature = firmas[0]!.signature;

  const tx = await connection.getTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  if (!tx || tx.meta?.err) return "sin-transaccion";

  const owner = new PublicKey(params.ownerPubkey);
  const mint = new PublicKey(params.mint);
  const cuentaComercio = getAssociatedTokenAddressSync(mint, owner).toBase58();

  const pre = tx.meta?.preTokenBalances ?? [];
  const post = tx.meta?.postTokenBalances ?? [];
  const accountKeys = tx.transaction.message.getAccountKeys({
    accountKeysFromLookups: tx.meta?.loadedAddresses,
  });

  const postComercio = post.find(
    (b) => b.mint === mint.toBase58() && accountKeys.get(b.accountIndex)?.toBase58() === cuentaComercio,
  );
  if (!postComercio) return "monto-invalido";
  const preComercio = pre.find((b) => b.accountIndex === postComercio.accountIndex);
  const recibido =
    BigInt(postComercio.uiTokenAmount.amount) - BigInt(preComercio?.uiTokenAmount.amount ?? "0");
  if (recibido <= 0n) return "monto-invalido";

  // El que paga la red en una transferencia simple es el propio cliente: es
  // la primera cuenta firmante de la transacción.
  const payer = accountKeys.get(0)?.toBase58() ?? "desconocido";

  const comercio = await buscarComercioPorPda(params.merchantPda);
  if (!comercio) return "sin-comercio";
  const terminal = comercio.terminals?.[0];
  if (!terminal) return "sin-comercio";

  const resultado = await registrarCobro({
    txSignature: signature,
    merchantId: comercio.id,
    posTerminalId: terminal.id,
    payerPubkey: payer,
    amountGross: recibido.toString(),
    // Sin contrato de por medio no hay comisión ni dust en este cobro: la
    // plataforma la cobra después, al retiro.
    posFee: "0",
    gasFee: "0",
    dust: "0",
    timestamp: new Date((tx.blockTime ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
    status: "CONFIRMED",
  });

  return resultado === null ? "ya-estaba" : "registrado";
}
