// Mintea el USDC de prueba (el mint propio guardado en devnet-state.json) a
// cualquier wallet. Como somos la mint authority, esto reemplaza al faucet
// externo cuando hay que fondear una wallet real (Phantom/Solflare) para
// probar el flujo de pago.
//
// Uso: pnpm exec tsx scripts/mint-test-usdc.ts <wallet> [monto=1000]
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  mintTo,
} from "@solana/spl-token";
import { getConnection, KEYS_DIR } from "../src/config.js";

const USDC_DECIMALS = 6;

async function main(): Promise<void> {
  const [, , walletArg, montoArg] = process.argv;
  if (!walletArg) {
    console.error("Uso: pnpm exec tsx scripts/mint-test-usdc.ts <wallet> [monto=1000]");
    process.exit(1);
  }

  const wallet = new PublicKey(walletArg);
  const montoUsdc = Number(montoArg ?? 1000);
  const montoMinimo = BigInt(Math.round(montoUsdc * 10 ** USDC_DECIMALS));

  const state = JSON.parse(readFileSync("devnet-state.json", "utf8")) as { mint: string };
  const mint = new PublicKey(state.mint);
  const owner = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(readFileSync(join(KEYS_DIR, "owner.json"), "utf8"))),
  );

  const connection = getConnection();
  const ata = getAssociatedTokenAddressSync(mint, wallet);

  await sendAndConfirmTransaction(
    connection,
    new Transaction().add(
      createAssociatedTokenAccountIdempotentInstruction(owner.publicKey, ata, wallet, mint),
    ),
    [owner],
  );

  const sig = await mintTo(connection, owner, mint, ata, owner, montoMinimo);
  console.log(
    `Minteados ${montoUsdc} USDC-test a ${wallet.toBase58()} (ATA ${ata.toBase58()}, tx ${sig.slice(0, 8)}…)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
