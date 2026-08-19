// Tesorería de la plataforma: retira TODO el saldo acumulado en el gas_vault
// del merchant (comisión fee_bps + dust) hacia la wallet de la plataforma.
//
// Modelo de negocio: el contrato solo deja retirar al `owner` del merchant y
// hacia una cuenta DEL owner. Como los merchants se crean con owner = wallet
// de la plataforma, estos fondos son exclusivamente nuestros. Este script es
// la operación de tesorería del informe (Parte 2.3.F): el USDC retirado se
// convierte a SOL off-chain para refondear el relayer.
import { ComputeBudgetProgram, PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { readFileSync } from "node:fs";
import { getConnection, loadKeypair } from "../src/config.js";
import { fetchMerchant, deriveGasVaultPda } from "../src/solana/merchant.js";
import { buildWithdrawGasFeesInstruction } from "../src/solana/instructions.js";

async function main(): Promise<void> {
  const connection = getConnection();
  const owner = loadKeypair("owner"); // wallet de la plataforma

  const state = JSON.parse(readFileSync("devnet-state.json", "utf8")) as {
    merchantAddress: string;
    mint: string;
  };
  const merchant = await fetchMerchant(connection, new PublicKey(state.merchantAddress));
  if (!merchant.owner.equals(owner.publicKey)) {
    throw new Error(
      `El owner del merchant (${merchant.owner.toBase58()}) no es la wallet de la plataforma — no se puede retirar`,
    );
  }

  const gasVault = deriveGasVaultPda(merchant.address);
  const balance = await connection.getTokenAccountBalance(gasVault);
  const amount = BigInt(balance.value.amount);
  console.log(`gas_vault ${gasVault.toBase58()}: ${balance.value.uiAmountString} tokens`);
  if (amount === 0n) {
    console.log("Nada que retirar.");
    return;
  }

  // Destino: ATA de la plataforma (el contrato exige destination.owner == owner).
  const platformAta = getAssociatedTokenAddressSync(merchant.paymentTokenMint, owner.publicKey);
  const ix = buildWithdrawGasFeesInstruction({
    owner: owner.publicKey,
    merchant,
    destination: platformAta,
    amount,
  });
  const tx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 100_000 }),
    ix,
  );
  const sig = await sendAndConfirmTransaction(connection, tx, [owner]);

  const after = await connection.getTokenAccountBalance(platformAta);
  console.log(`Retirado ${balance.value.uiAmountString} → plataforma ${platformAta.toBase58()}`);
  console.log(`Saldo plataforma: ${after.value.uiAmountString} | tx: ${sig}`);
  console.log(`https://explorer.solana.com/tx/${sig}?cluster=devnet`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
