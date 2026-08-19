// Prueba del cobro por QR de punta a punta, tal como lo haría una billetera:
//   1. Lee el QR (Solana Pay, modo "transaction request") y pide la transacción
//      al endpoint de la app, igual que Phantom o Solflare.
//   2. Comprueba que venga firmada por el relayer y que ejecute `pay()`.
//   3. Añade la firma del cliente y la envía él mismo — sin gastar SOL.
//   4. Verifica que el dinero se repartió según la configuración del comercio.
import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { readFileSync } from "node:fs";
import { getConnection, loadKeypair } from "../src/config.js";
import { fetchMerchant, deriveGasVaultPda } from "../src/solana/merchant.js";
import { PROGRAM_ID } from "../src/solana/constants.js";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const AMOUNT_HUMAN = 2; // 2 unidades del token de prueba

async function balance(connection: Connection, account: PublicKey): Promise<bigint> {
  const info = await connection.getTokenAccountBalance(account).catch(() => null);
  return BigInt(info?.value.amount ?? "0");
}

async function main(): Promise<void> {
  const connection = getConnection();
  const user = loadKeypair("user");
  const state = JSON.parse(readFileSync("devnet-state.json", "utf8")) as {
    merchantAddress: string;
    userAta: string;
    posFeeAta: string;
    destinationWallets: string[];
  };

  const merchant = await fetchMerchant(connection, new PublicKey(state.merchantAddress));
  const decimals = 6;
  const amountRaw = BigInt(AMOUNT_HUMAN * 10 ** decimals);

  // Lo que codifica el QR del POS.
  const reference = Keypair.generate().publicKey;
  const requestUrl = new URL(`${APP_URL}/api/pay`);
  requestUrl.searchParams.set("merchant", state.merchantAddress);
  requestUrl.searchParams.set("amount", amountRaw.toString());
  requestUrl.searchParams.set("reference", reference.toBase58());
  requestUrl.searchParams.set("label", "Comercio de prueba");

  console.log(`QR: solana:${encodeURIComponent(requestUrl.toString())}`);
  console.log(`SOL del cliente: ${await connection.getBalance(user.publicKey)} lamports`);

  // 1. La billetera pide cómo mostrar el cobro.
  const meta = (await (await fetch(requestUrl)).json()) as { label: string; icon: string };
  console.log(`etiqueta="${meta.label}" ✓`);

  // 2. La billetera pide la transacción para su cuenta.
  const res = await fetch(requestUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ account: user.publicKey.toBase58() }),
  });
  const body = (await res.json()) as { transaction?: string; error?: string };
  if (!res.ok || !body.transaction) throw new Error(body.error ?? "sin transacción");

  const tx = Transaction.from(Buffer.from(body.transaction, "base64"));

  // 3. Comprobaciones antes de firmar: es lo que haría una billetera prudente.
  const relayer = loadKeypair("relayer");
  const relayerSig = tx.signatures.find((s) => s.publicKey.equals(relayer.publicKey));
  if (!tx.feePayer?.equals(relayer.publicKey)) throw new Error("el fee payer no es el relayer");
  if (!relayerSig?.signature) throw new Error("falta la firma del relayer");
  const payIx = tx.instructions.find((ix) => ix.programId.equals(PROGRAM_ID));
  if (!payIx) throw new Error("la transacción no ejecuta el contrato");
  if (!payIx.keys.some((k) => k.pubkey.equals(reference))) {
    throw new Error("falta la referencia para conciliar el cobro");
  }
  console.log("tx firmada por el relayer, ejecuta pay() y lleva la referencia ✓");

  const before = {
    user: await balance(connection, new PublicKey(state.userAta)),
    posFee: await balance(connection, new PublicKey(state.posFeeAta)),
    destA: await balance(connection, new PublicKey(state.destinationWallets[0]!)),
    destB: await balance(connection, new PublicKey(state.destinationWallets[1]!)),
    gasVault: await balance(connection, deriveGasVaultPda(merchant.address)),
  };

  // 4. El cliente firma y envía. El fee lo paga el relayer.
  tx.partialSign(user);
  const signature = await connection.sendRawTransaction(tx.serialize());
  // `lastValidBlockHeight` no viaja en la transacción serializada, así que se
  // consulta el estado directamente en vez de usar la estrategia por altura.
  const deadline = Date.now() + 60_000;
  for (;;) {
    const status = (await connection.getSignatureStatuses([signature])).value[0];
    if (status?.err) throw new Error(`la transacción falló: ${JSON.stringify(status.err)}`);
    if (status?.confirmationStatus === "confirmed" || status?.confirmationStatus === "finalized") break;
    if (Date.now() > deadline) throw new Error("timeout esperando confirmación");
    await new Promise((r) => setTimeout(r, 500));
  }

  const after = {
    user: await balance(connection, new PublicKey(state.userAta)),
    posFee: await balance(connection, new PublicKey(state.posFeeAta)),
    destA: await balance(connection, new PublicKey(state.destinationWallets[0]!)),
    destB: await balance(connection, new PublicKey(state.destinationWallets[1]!)),
    gasVault: await balance(connection, deriveGasVaultPda(merchant.address)),
  };

  const posFee = (amountRaw * BigInt(merchant.posFeeBps)) / 10_000n;
  const afterPosFee = amountRaw - posFee;
  const gasFee = (afterPosFee * BigInt(merchant.feeBps)) / 10_000n;
  const distributable = afterPosFee - gasFee;
  const splitA = (distributable * BigInt(merchant.percentages[0]!)) / 100n;
  const splitB = (distributable * BigInt(merchant.percentages[1]!)) / 100n;
  const dust = distributable - splitA - splitB;

  const checks: [string, bigint, bigint][] = [
    ["cliente pagó", before.user - after.user, amountRaw],
    ["comisión POS", after.posFee - before.posFee, posFee],
    ["destino A", after.destA - before.destA, splitA],
    ["destino B", after.destB - before.destB, splitB],
    ["comisión gas", after.gasVault - before.gasVault, gasFee + dust],
  ];

  let ok = true;
  for (const [label, got, expected] of checks) {
    const mark = got === expected ? "✓" : "✗";
    if (got !== expected) ok = false;
    console.log(`  ${label}: ${got} (esperado ${expected}) ${mark}`);
  }

  // La billetera del cliente nunca gastó SOL: el fee salió del relayer.
  const userSol = await connection.getBalance(user.publicKey);
  console.log(`SOL del cliente al final: ${userSol} lamports ${userSol === 0 ? "✓" : "✗"}`);

  if (!ok || userSol !== 0) throw new Error("el reparto no coincide");
  console.log(`\nCOBRO POR QR OK ✓ — https://explorer.solana.com/tx/${signature}?cluster=devnet`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
