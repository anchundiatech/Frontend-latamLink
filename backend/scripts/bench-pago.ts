// Benchmark del pago gasless E2E (línea base del /loop-pago-devnet):
// N pagos completos contra devnet; reporta latencia por corrida, p50,
// éxitos/fallos y lamports gastados por el relayer.
import { Transaction } from "@solana/web3.js";
import { readFileSync } from "node:fs";
import { getConnection, loadKeypair, loadRelayer } from "../src/config.js";
import { buildPayTransaction, submitSignedTransaction } from "../src/relayer/service.js";

const RUNS = 5;
const AMOUNT = 1_000_000n; // 1 USDC-test por corrida

async function main(): Promise<void> {
  const state = JSON.parse(readFileSync("devnet-state.json", "utf8"));
  const connection = getConnection();
  const user = loadKeypair("user");
  const relayer = loadRelayer();

  const relayerBefore = await connection.getBalance(relayer.publicKey);
  const latencies: number[] = [];
  let failures = 0;

  for (let i = 1; i <= RUNS; i++) {
    const t0 = Date.now();
    try {
      const built = await buildPayTransaction(connection, relayer.publicKey, {
        merchantAddress: state.merchantAddress,
        payerPubkey: user.publicKey.toBase58(),
        amount: AMOUNT,
      });
      const tx = Transaction.from(Buffer.from(built.transaction, "base64"));
      tx.partialSign(user);
      const signed = tx
        .serialize({ requireAllSignatures: false, verifySignatures: false })
        .toString("base64");
      const { signature } = await submitSignedTransaction(connection, relayer, signed);
      const ms = Date.now() - t0;
      latencies.push(ms);
      console.log(`corrida ${i}/${RUNS}: ${ms}ms ✓ (${signature.slice(0, 8)}…)`);
    } catch (err) {
      failures++;
      console.log(`corrida ${i}/${RUNS}: FALLÓ — ${(err as Error).message}`);
    }
  }

  const relayerAfter = await connection.getBalance(relayer.publicKey);
  const sorted = [...latencies].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length / 2)] ?? 0;
  const spent = relayerBefore - relayerAfter;

  console.log("\n=== RESULTADO BENCH ===");
  console.log(`éxitos:        ${latencies.length}/${RUNS}`);
  console.log(`latencias ms:  [${latencies.join(", ")}]`);
  console.log(`p50:           ${p50}ms`);
  console.log(`lamports/tx:   ${latencies.length ? Math.round(spent / latencies.length) : "n/a"} (total ${spent})`);
  if (failures > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
