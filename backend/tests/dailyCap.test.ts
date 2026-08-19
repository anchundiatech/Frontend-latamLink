import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { Keypair, PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "../src/solana/constants.js";
import { buildPayTx, encodeMerchant, fakeConnection } from "./helpers.js";

// El límite diario vive en un módulo con estado, así que este caso corre en su
// propio archivo (node:test aísla cada archivo en un proceso): fijamos el tope
// ANTES de importar la config. 25.000 lamports = 2 transacciones de 10.000.
process.env.RELAYER_DAILY_LAMPORTS_CAP = "25000";

const RELAYER = Keypair.generate();
const MERCHANT = Keypair.generate().publicKey;
const PLATFORM_OWNER = Keypair.generate().publicKey;
process.env.PLATFORM_OWNER_PUBKEY = PLATFORM_OWNER.toBase58();

function connection() {
  const data = encodeMerchant({
    owner: PLATFORM_OWNER,
    mint: Keypair.generate().publicKey,
    merchantId: 1n,
    posTerminalId: "TERM-CAP",
    destinations: [Keypair.generate().publicKey],
    percentages: [100],
    feeBps: 100,
    posFeeBps: 50,
    minPaymentAmount: 10_000n,
    isActive: true,
  });
  return fakeConnection(new Map([[MERCHANT.toBase58(), { data, owner: PROGRAM_ID }]]));
}

describe("límite de gasto diario del relayer", () => {
  it("corta cuando el gasto estimado supera el tope diario", async () => {
    const { validateSignedTransaction } = await import("../src/relayer/validate.js");

    const attempt = () =>
      validateSignedTransaction(
        connection(),
        buildPayTx({
          payer: Keypair.generate(),
          merchant: MERCHANT,
          relayer: RELAYER.publicKey,
          amount: 1_000_000n,
        }),
        RELAYER.publicKey,
      );

    await attempt(); // 10.000 lamports acumulados
    await attempt(); // 20.000 lamports acumulados

    await assert.rejects(attempt(), (err: Error) => {
      assert.match(err.message, /límite diario/i);
      return true;
    });
  });
});
