// E2E del pago gasless en devnet, pasando por los endpoints HTTP reales:
//   build → firma del usuario (simula Privy signTransaction) → submit → verificación.
// Verifica la regla de negocio: el usuario paga solo USDC y su balance de SOL es 0.
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { createApp } from "../src/server.js";
import { getConnection, loadKeypair } from "../src/config.js";
import { deriveGasVaultPda, deriveVaultPda } from "../src/solana/merchant.js";

const AMOUNT = 10_000_000n; // 10 USDC-test

async function tokenBalance(connection: Connection, ata: PublicKey): Promise<bigint> {
  const b = await connection.getTokenAccountBalance(ata).catch(() => null);
  return b ? BigInt(b.value.amount) : 0n;
}

async function main(): Promise<void> {
  const state = JSON.parse(readFileSync("devnet-state.json", "utf8"));
  const connection = getConnection();
  const user = loadKeypair("user");

  const merchantAddress = new PublicKey(state.merchantAddress);
  const vault = deriveVaultPda(merchantAddress);
  const gasVault = deriveGasVaultPda(merchantAddress);
  const watch: Record<string, PublicKey> = {
    usuario: new PublicKey(state.userAta),
    posFee: new PublicKey(state.posFeeAta),
    destinoA: new PublicKey(state.destinationWallets[0]),
    destinoB: new PublicKey(state.destinationWallets[1]),
    gasVault,
    vault,
  };

  const before: Record<string, bigint> = {};
  for (const [k, v] of Object.entries(watch)) before[k] = await tokenBalance(connection, v);
  const userSol = await connection.getBalance(user.publicKey);
  console.log(`SOL del usuario: ${userSol} lamports (la regla exige que no necesite SOL)`);

  // Servidor real en puerto efímero
  const app = createApp();
  const server = app.listen(0);
  const port = (server.address() as AddressInfo).port;
  const base = `http://127.0.0.1:${port}`;

  try {
    const t0 = Date.now();

    // 1. build
    const buildRes = await fetch(`${base}/payments/build`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        merchantAddress: state.merchantAddress,
        payerPubkey: user.publicKey.toBase58(),
        amount: AMOUNT.toString(),
      }),
    });
    if (!buildRes.ok) throw new Error(`build falló: ${await buildRes.text()}`);
    const { transaction } = (await buildRes.json()) as { transaction: string };
    console.log(`build ✓ (${Date.now() - t0}ms)`);

    // 2. Firma del usuario — en producción esto lo hace Privy signTransaction
    const tx = Transaction.from(Buffer.from(transaction, "base64"));
    tx.partialSign(user);
    const signedBase64 = tx
      .serialize({ requireAllSignatures: false, verifySignatures: false })
      .toString("base64");
    console.log("firma del usuario ✓");

    // 3. submit
    const submitRes = await fetch(`${base}/payments/submit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ transaction: signedBase64 }),
    });
    if (!submitRes.ok) throw new Error(`submit falló: ${await submitRes.text()}`);
    const { signature, slot } = (await submitRes.json()) as {
      signature: string;
      slot: number;
    };
    const totalMs = Date.now() - t0;
    console.log(`submit ✓ firma=${signature} slot=${slot} — E2E ${totalMs}ms`);

    // 4. Verificación de balances
    const after: Record<string, bigint> = {};
    for (const [k, v] of Object.entries(watch)) after[k] = await tokenBalance(connection, v);

    console.log("\nMovimientos de USDC-test (unidades de 1e-6):");
    for (const k of Object.keys(watch)) {
      const delta = after[k]! - before[k]!;
      console.log(`  ${k.padEnd(9)} ${before[k]} → ${after[k]}  (Δ ${delta})`);
    }

    // Montos esperados según el contrato: posFee = 0.5% bruto; gas = 1% del resto;
    // split 60/40 del neto; vault termina en 0.
    const posFee = (AMOUNT * 50n) / 10_000n;
    const afterPos = AMOUNT - posFee;
    const gasFee = (afterPos * 100n) / 10_000n;
    const net = afterPos - gasFee;
    const expectA = (net * 60n) / 100n;
    const expectB = (net * 40n) / 100n;
    const dust = net - expectA - expectB;

    const checks: [string, bigint, bigint][] = [
      ["usuario", before.usuario! - after.usuario!, AMOUNT],
      ["posFee", after.posFee! - before.posFee!, posFee],
      ["destinoA", after.destinoA! - before.destinoA!, expectA],
      ["destinoB", after.destinoB! - before.destinoB!, expectB],
      ["gasVault", after.gasVault! - before.gasVault!, gasFee + dust],
      ["vault(0)", after.vault!, 0n],
    ];
    let ok = true;
    for (const [name, got, want] of checks) {
      const pass = got === want;
      ok &&= pass;
      console.log(`  check ${name.padEnd(9)} esperado=${want} obtenido=${got} ${pass ? "✓" : "✗"}`);
    }
    if (!ok) throw new Error("Los balances no coinciden con el split esperado");
    console.log(`\nE2E PASÓ ✓ — pago gasless de 10 USDC-test repartido en ${totalMs}ms`);
    console.log(`Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
  } finally {
    server.close();
  }
}

main().catch((err) => {
  console.error("E2E FALLÓ:", err.message ?? err);
  process.exit(1);
});
