import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import {
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";

const PLATFORM_OWNER = Keypair.generate();
process.env.PLATFORM_OWNER_PUBKEY = PLATFORM_OWNER.publicKey.toBase58();

const RELAYER = Keypair.generate();
const DUEÑO = Keypair.generate();
const MINT = Keypair.generate().publicKey;
const FUENTE = getAssociatedTokenAddressSync(MINT, DUEÑO.publicKey);
const DESTINO = getAssociatedTokenAddressSync(MINT, Keypair.generate().publicKey);
const ATA_PLATAFORMA = getAssociatedTokenAddressSync(MINT, PLATFORM_OWNER.publicKey);

function stubConnection(): Connection {
  return {
    sendRawTransaction: async () => "firma-simulada",
  } as unknown as Connection;
}

interface ArmarOpciones {
  segundaTransferencia?: { destino: PublicKey; fuente?: PublicKey; dueño?: PublicKey };
  crearAtaPlataforma?: boolean;
  firmar?: boolean;
}

function armarRetiro(monto: bigint, opciones: ArmarOpciones = {}): Transaction {
  const tx = new Transaction({
    feePayer: RELAYER.publicKey,
    blockhash: Keypair.generate().publicKey.toBase58(),
    lastValidBlockHeight: 1_000_000,
  });

  tx.add(createTransferCheckedInstruction(FUENTE, MINT, DESTINO, DUEÑO.publicKey, monto, 6));

  if (opciones.segundaTransferencia) {
    if (opciones.crearAtaPlataforma) {
      tx.add(
        createAssociatedTokenAccountInstruction(
          RELAYER.publicKey,
          opciones.segundaTransferencia.destino,
          PLATFORM_OWNER.publicKey,
          MINT,
        ),
      );
    }
    tx.add(
      createTransferCheckedInstruction(
        opciones.segundaTransferencia.fuente ?? FUENTE,
        MINT,
        opciones.segundaTransferencia.destino,
        opciones.segundaTransferencia.dueño ?? DUEÑO.publicKey,
        monto / 10n,
        6,
      ),
    );
  }

  if (opciones.firmar !== false) tx.partialSign(DUEÑO);

  return Transaction.from(tx.serialize({ requireAllSignatures: false, verifySignatures: false }));
}

describe("submitPayoutTransaction — comisión de plataforma en el retiro", () => {
  it("acepta un retiro con una sola transferencia (sin comisión, caso ya existente)", async () => {
    const { submitPayoutTransaction } = await import("../src/payouts/service.js");
    const result = await submitPayoutTransaction(
      stubConnection(),
      RELAYER,
      armarRetiro(1_000_000n).serialize({ requireAllSignatures: false }).toString("base64"),
    );
    assert.equal(result.signature, "firma-simulada");
  });

  it("acepta un retiro con dos transferencias cuando la segunda va a la ATA de la plataforma", async () => {
    const { submitPayoutTransaction } = await import("../src/payouts/service.js");
    const tx = armarRetiro(1_000_000n, { segundaTransferencia: { destino: ATA_PLATAFORMA } });
    const result = await submitPayoutTransaction(
      stubConnection(),
      RELAYER,
      tx.serialize({ requireAllSignatures: false }).toString("base64"),
    );
    assert.equal(result.signature, "firma-simulada");
  });

  it("acepta crear la ATA de la plataforma si todavía no existe", async () => {
    const { submitPayoutTransaction } = await import("../src/payouts/service.js");
    const tx = armarRetiro(1_000_000n, {
      segundaTransferencia: { destino: ATA_PLATAFORMA },
      crearAtaPlataforma: true,
    });
    const result = await submitPayoutTransaction(
      stubConnection(),
      RELAYER,
      tx.serialize({ requireAllSignatures: false }).toString("base64"),
    );
    assert.equal(result.signature, "firma-simulada");
  });

  it("rechaza la comisión si no va a la ATA de la plataforma", async () => {
    const { submitPayoutTransaction } = await import("../src/payouts/service.js");
    const otraCuenta = getAssociatedTokenAddressSync(MINT, Keypair.generate().publicKey);
    const tx = armarRetiro(1_000_000n, { segundaTransferencia: { destino: otraCuenta } });
    await assert.rejects(
      submitPayoutTransaction(
        stubConnection(),
        RELAYER,
        tx.serialize({ requireAllSignatures: false }).toString("base64"),
      ),
      /no puede ir a otra cuenta/i,
    );
  });

  it("rechaza si la comisión sale de una cuenta distinta al retiro", async () => {
    const { submitPayoutTransaction } = await import("../src/payouts/service.js");
    const otraFuente = getAssociatedTokenAddressSync(MINT, Keypair.generate().publicKey);
    const tx = armarRetiro(1_000_000n, {
      segundaTransferencia: { destino: ATA_PLATAFORMA, fuente: otraFuente },
    });
    await assert.rejects(
      submitPayoutTransaction(
        stubConnection(),
        RELAYER,
        tx.serialize({ requireAllSignatures: false }).toString("base64"),
      ),
      /misma cuenta/i,
    );
  });

  it("rechaza una tercera transferencia", async () => {
    const { submitPayoutTransaction } = await import("../src/payouts/service.js");
    const tx = new Transaction({
      feePayer: RELAYER.publicKey,
      blockhash: Keypair.generate().publicKey.toBase58(),
      lastValidBlockHeight: 1_000_000,
    });
    tx.add(
      createTransferCheckedInstruction(FUENTE, MINT, DESTINO, DUEÑO.publicKey, 900_000n, 6),
      createTransferCheckedInstruction(FUENTE, MINT, ATA_PLATAFORMA, DUEÑO.publicKey, 50_000n, 6),
      createTransferCheckedInstruction(FUENTE, MINT, DESTINO, DUEÑO.publicKey, 1n, 6),
    );
    tx.partialSign(DUEÑO);
    const firmada = Transaction.from(
      tx.serialize({ requireAllSignatures: false, verifySignatures: false }),
    );
    await assert.rejects(
      submitPayoutTransaction(
        stubConnection(),
        RELAYER,
        firmada.serialize({ requireAllSignatures: false }).toString("base64"),
      ),
      /se esperaba una transferencia, o dos/i,
    );
  });
});
