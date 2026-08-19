import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { Keypair } from "@solana/web3.js";
import {
  PAYMENT_PROCESSED_DISCRIMINATOR,
  decodePaymentProcessed,
  extractPaymentEvents,
} from "../src/events/paymentProcessed.js";

// Codifica el evento tal como lo emite Anchor, para comprobar que lo leemos
// igual. Si el decodificador se corriera un byte, el historial guardaría
// importes equivocados sin que nada falle a la vista.
function codificarEvento(params: {
  merchant: Keypair;
  payer: Keypair;
  posTerminalId: string;
  amount: bigint;
  posFee: bigint;
  gasFee: bigint;
  dust: bigint;
  splitAmounts: bigint[];
  timestamp: bigint;
}): string {
  const terminal = Buffer.from(params.posTerminalId, "utf8");
  const data = Buffer.alloc(
    8 + 32 + 32 + 4 + terminal.length + 8 * 4 + 4 + params.splitAmounts.length * 8 + 8,
  );

  let o = 0;
  PAYMENT_PROCESSED_DISCRIMINATOR.copy(data, o);
  o += 8;
  params.merchant.publicKey.toBuffer().copy(data, o);
  o += 32;
  params.payer.publicKey.toBuffer().copy(data, o);
  o += 32;
  data.writeUInt32LE(terminal.length, o);
  o += 4;
  terminal.copy(data, o);
  o += terminal.length;
  for (const valor of [params.amount, params.posFee, params.gasFee, params.dust]) {
    data.writeBigUInt64LE(valor, o);
    o += 8;
  }
  data.writeUInt32LE(params.splitAmounts.length, o);
  o += 4;
  for (const valor of params.splitAmounts) {
    data.writeBigUInt64LE(valor, o);
    o += 8;
  }
  data.writeBigInt64LE(params.timestamp, o);

  return data.toString("base64");
}

const MERCHANT = Keypair.generate();
const PAYER = Keypair.generate();

const EVENTO = {
  merchant: MERCHANT,
  payer: PAYER,
  posTerminalId: "TERM-DEMO-001",
  amount: 2_000_000n,
  posFee: 10_000n,
  gasFee: 19_900n,
  dust: 0n,
  splitAmounts: [1_182_060n, 788_040n],
  timestamp: 1_787_113_803n,
};

describe("evento PaymentProcessed", () => {
  it("lee todos los campos en el orden del contrato", () => {
    const decodificado = decodePaymentProcessed(codificarEvento(EVENTO));

    assert.ok(decodificado);
    assert.equal(decodificado.merchant.toBase58(), MERCHANT.publicKey.toBase58());
    assert.equal(decodificado.payer.toBase58(), PAYER.publicKey.toBase58());
    assert.equal(decodificado.posTerminalId, "TERM-DEMO-001");
    assert.equal(decodificado.amount, 2_000_000n);
    assert.equal(decodificado.posFee, 10_000n);
    assert.equal(decodificado.gasFee, 19_900n);
    assert.equal(decodificado.dust, 0n);
    assert.deepEqual(decodificado.splitAmounts, [1_182_060n, 788_040n]);
    assert.equal(decodificado.timestamp, 1_787_113_803n);
  });

  it("las comisiones más el reparto suman el monto cobrado", () => {
    const e = decodePaymentProcessed(codificarEvento(EVENTO))!;
    const repartido =
      e.posFee + e.gasFee + e.dust + e.splitAmounts.reduce((total, v) => total + v, 0n);

    assert.equal(repartido, e.amount);
  });

  it("ignora los logs que no son este evento", () => {
    assert.equal(decodePaymentProcessed("bm8gZXMgdW4gZXZlbnRv"), null);
    assert.equal(decodePaymentProcessed("no-es-base64-!!"), null);
  });

  it("extrae el evento de los logs de una transacción, ignorando el ruido", () => {
    const logs = [
      "Program GSeGuv2K3meepgSHCehP5jGkRnjRZk96a9vsPSSJ7TjC invoke [1]",
      "Program log: Instruction: Pay",
      `Program data: ${codificarEvento(EVENTO)}`,
      "Program consumed 42000 of 1000000 compute units",
    ];

    const eventos = extractPaymentEvents(logs);
    assert.equal(eventos.length, 1);
    assert.equal(eventos[0]!.amount, 2_000_000n);
  });

  it("no se cae con un evento truncado", () => {
    const completo = Buffer.from(codificarEvento(EVENTO), "base64");
    const recortado = completo.subarray(0, 40).toString("base64");

    assert.deepEqual(extractPaymentEvents([`Program data: ${recortado}`]), []);
  });
});
