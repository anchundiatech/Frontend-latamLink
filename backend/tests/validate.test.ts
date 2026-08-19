import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { ComputeBudgetProgram, Keypair, PublicKey } from "@solana/web3.js";
import { PROGRAM_ID, anchorDiscriminator } from "../src/solana/constants.js";
import { validateSignedTransaction } from "../src/relayer/validate.js";
import {
  buildPayTx,
  encodeMerchant,
  fakeConnection,
  transferInstruction,
} from "./helpers.js";

// La plataforma es el owner de los comercios legítimos: se fija antes de que
// nada la lea (la config la resuelve de forma perezosa).
const PLATFORM_OWNER = Keypair.generate().publicKey;
process.env.PLATFORM_OWNER_PUBKEY = PLATFORM_OWNER.toBase58();

// Escenario base: un merchant activo, mínimo 10.000 (0.01 USDC).
const RELAYER = Keypair.generate();
const MERCHANT = Keypair.generate().publicKey;
const MINT = Keypair.generate().publicKey;
const MIN_AMOUNT = 10_000n;
const AMOUNT = 1_000_000n;

function connectionWith(overrides?: {
  isActive?: boolean;
  owner?: PublicKey;
  merchantOwner?: PublicKey;
}) {
  const data = encodeMerchant({
    owner: overrides?.merchantOwner ?? PLATFORM_OWNER,
    mint: MINT,
    merchantId: 1n,
    posTerminalId: "TERM-TEST-001",
    destinations: [Keypair.generate().publicKey, Keypair.generate().publicKey],
    percentages: [60, 40],
    feeBps: 100,
    posFeeBps: 50,
    minPaymentAmount: MIN_AMOUNT,
    isActive: overrides?.isActive ?? true,
  });
  return fakeConnection(
    new Map([[MERCHANT.toBase58(), { data, owner: overrides?.owner ?? PROGRAM_ID }]]),
  );
}

async function expectRejection(promise: Promise<unknown>, fragment: string): Promise<void> {
  await assert.rejects(promise, (err: Error) => {
    assert.match(err.message, new RegExp(fragment, "i"), `mensaje inesperado: ${err.message}`);
    return true;
  });
}

describe("validateSignedTransaction — anti-abuso del relayer", () => {
  it("acepta una transacción legítima y devuelve los datos del pago", async () => {
    const payer = Keypair.generate();
    const result = await validateSignedTransaction(
      connectionWith(),
      buildPayTx({ payer, merchant: MERCHANT, relayer: RELAYER.publicKey, amount: AMOUNT }),
      RELAYER.publicKey,
    );

    assert.equal(result.payer.toBase58(), payer.publicKey.toBase58());
    assert.equal(result.merchant.toBase58(), MERCHANT.toBase58());
    assert.equal(result.amount, AMOUNT);
  });

  it("rechaza si el fee payer no es el relayer (el relayer no regala firmas ajenas)", async () => {
    const payer = Keypair.generate();
    const tx = buildPayTx({
      payer,
      merchant: MERCHANT,
      relayer: RELAYER.publicKey,
      amount: AMOUNT,
      feePayer: Keypair.generate().publicKey,
    });
    await expectRejection(
      validateSignedTransaction(connectionWith(), tx, RELAYER.publicKey),
      "fee payer no es el relayer",
    );
  });

  it("rechaza instrucciones de programas no permitidos (drenaje de SOL)", async () => {
    const payer = Keypair.generate();
    const tx = buildPayTx({
      payer,
      merchant: MERCHANT,
      relayer: RELAYER.publicKey,
      amount: AMOUNT,
      extraInstruction: transferInstruction(payer.publicKey, Keypair.generate().publicKey),
    });
    await expectRejection(
      validateSignedTransaction(connectionWith(), tx, RELAYER.publicKey),
      "instrucciones no permitidas",
    );
  });

  it("rechaza más de una instrucción del programa latamlink_pay", async () => {
    const payer = Keypair.generate();
    const tx = buildPayTx({
      payer,
      merchant: MERCHANT,
      relayer: RELAYER.publicKey,
      amount: AMOUNT,
      duplicatePayIx: true,
    });
    await expectRejection(
      validateSignedTransaction(connectionWith(), tx, RELAYER.publicKey),
      "exactamente una instrucción",
    );
  });

  it("rechaza otra instrucción del programa que no sea `pay`", async () => {
    const payer = Keypair.generate();
    const tx = buildPayTx({
      payer,
      merchant: MERCHANT,
      relayer: RELAYER.publicKey,
      amount: AMOUNT,
      discriminator: anchorDiscriminator("withdraw_gas_fees"),
    });
    await expectRejection(
      validateSignedTransaction(connectionWith(), tx, RELAYER.publicKey),
      "no es `pay`",
    );
  });

  it("rechaza datos de `pay` malformados", async () => {
    const payer = Keypair.generate();
    const tx = buildPayTx({
      payer,
      merchant: MERCHANT,
      relayer: RELAYER.publicKey,
      amount: AMOUNT,
      dataLength: 24,
    });
    await expectRejection(
      validateSignedTransaction(connectionWith(), tx, RELAYER.publicKey),
      "malformados",
    );
  });

  it("rechaza si el relayer aparece como cuenta de una instrucción", async () => {
    const payer = Keypair.generate();
    const tx = buildPayTx({
      payer,
      merchant: MERCHANT,
      relayer: RELAYER.publicKey,
      amount: AMOUNT,
      extraKeys: [RELAYER.publicKey],
    });
    await expectRejection(
      validateSignedTransaction(connectionWith(), tx, RELAYER.publicKey),
      "relayer no puede aparecer",
    );
  });

  it("rechaza si falta la firma del usuario", async () => {
    const payer = Keypair.generate();
    const tx = buildPayTx({
      payer,
      merchant: MERCHANT,
      relayer: RELAYER.publicKey,
      amount: AMOUNT,
      skipPayerSignature: true,
    });
    await expectRejection(
      validateSignedTransaction(connectionWith(), tx, RELAYER.publicKey),
      "falta la firma",
    );
  });

  it("rechaza el reenvío de una transacción ya procesada (replay)", async () => {
    const payer = Keypair.generate();
    const tx = buildPayTx({
      payer,
      merchant: MERCHANT,
      relayer: RELAYER.publicKey,
      amount: AMOUNT,
    });
    await validateSignedTransaction(connectionWith(), tx, RELAYER.publicKey);
    await expectRejection(
      validateSignedTransaction(connectionWith(), tx, RELAYER.publicKey),
      "ya procesada",
    );
  });

  it("rechaza si la cuenta merchant no pertenece al programa", async () => {
    const payer = Keypair.generate();
    const tx = buildPayTx({
      payer,
      merchant: MERCHANT,
      relayer: RELAYER.publicKey,
      amount: AMOUNT,
    });
    await expectRejection(
      validateSignedTransaction(
        connectionWith({ owner: Keypair.generate().publicKey }),
        tx,
        RELAYER.publicKey,
      ),
      "merchant inválido",
    );
  });

  it("rechaza si el comercio está inactivo", async () => {
    const payer = Keypair.generate();
    const tx = buildPayTx({
      payer,
      merchant: MERCHANT,
      relayer: RELAYER.publicKey,
      amount: AMOUNT,
    });
    await expectRejection(
      validateSignedTransaction(connectionWith({ isActive: false }), tx, RELAYER.publicKey),
      "inactivo",
    );
  });

  it("rechaza comercios que no son de la plataforma (gas gratis para terceros)", async () => {
    const payer = Keypair.generate();
    const tx = buildPayTx({
      payer,
      merchant: MERCHANT,
      relayer: RELAYER.publicKey,
      amount: AMOUNT,
    });
    await expectRejection(
      validateSignedTransaction(
        connectionWith({ merchantOwner: Keypair.generate().publicKey }),
        tx,
        RELAYER.publicKey,
      ),
      "no pertenece a la plataforma",
    );
  });

  it("rechaza una firma con la forma correcta pero criptográficamente inválida", async () => {
    const payer = Keypair.generate();
    const tx = buildPayTx({
      payer,
      merchant: MERCHANT,
      relayer: RELAYER.publicKey,
      amount: AMOUNT,
      forgeSignature: true,
    });
    await expectRejection(
      validateSignedTransaction(connectionWith(), tx, RELAYER.publicKey),
      "firma del usuario no es válida",
    );
  });

  it("rechaza fees de prioridad que vaciarían al relayer", async () => {
    const payer = Keypair.generate();
    const tx = buildPayTx({
      payer,
      merchant: MERCHANT,
      relayer: RELAYER.publicKey,
      amount: AMOUNT,
      // Límite de cómputo admisible, pero precio por unidad desorbitado: sin
      // la guarda, el relayer pagaría ~1 SOL de fee en una sola transacción.
      computeBudgetIxs: [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 1_000_000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1_000_000_000 }),
      ],
    });
    await expectRejection(
      validateSignedTransaction(connectionWith(), tx, RELAYER.publicKey),
      "fee de prioridad",
    );
  });

  it("rechaza límites de cómputo por encima del necesario", async () => {
    const payer = Keypair.generate();
    const tx = buildPayTx({
      payer,
      merchant: MERCHANT,
      relayer: RELAYER.publicKey,
      amount: AMOUNT,
      computeBudgetIxs: [ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 })],
    });
    await expectRejection(
      validateSignedTransaction(connectionWith(), tx, RELAYER.publicKey),
      "límite de cómputo",
    );
  });

  it("rechaza instrucciones de ComputeBudget que no sean límite o precio", async () => {
    const payer = Keypair.generate();
    const tx = buildPayTx({
      payer,
      merchant: MERCHANT,
      relayer: RELAYER.publicKey,
      amount: AMOUNT,
      computeBudgetIxs: [ComputeBudgetProgram.requestHeapFrame({ bytes: 256 * 1024 })],
    });
    await expectRejection(
      validateSignedTransaction(connectionWith(), tx, RELAYER.publicKey),
      "ComputeBudget no permitida",
    );
  });

  it("rechaza montos por debajo del mínimo del comercio", async () => {
    const payer = Keypair.generate();
    const tx = buildPayTx({
      payer,
      merchant: MERCHANT,
      relayer: RELAYER.publicKey,
      amount: MIN_AMOUNT - 1n,
    });
    await expectRejection(
      validateSignedTransaction(connectionWith(), tx, RELAYER.publicKey),
      "menor al mínimo",
    );
  });
});
