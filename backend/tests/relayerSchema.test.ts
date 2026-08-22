import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  buildPaymentSchema,
  listPaymentsQuerySchema,
  solanaPaySchema,
} from "../src/schemas/relayerSchema.js";

const VALID_PUBKEY = "2f9EpTUNzFo67EJcYqQGaGqJURJUTLaYNaKdWTR9Wu8W";

describe("relayerSchema — invariante amount > 0 en el límite de confianza", () => {
  it("acepta un amount string válido y lo convierte a bigint", () => {
    const result = buildPaymentSchema.safeParse({
      merchantAddress: VALID_PUBKEY,
      payerPubkey: VALID_PUBKEY,
      amount: "1000000",
    });

    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.amount, 1_000_000n);
      assert.equal(typeof result.data.amount, "bigint");
    }
  });

  it("acepta un amount number válido", () => {
    const result = buildPaymentSchema.safeParse({
      merchantAddress: VALID_PUBKEY,
      payerPubkey: VALID_PUBKEY,
      amount: 500,
    });

    assert.equal(result.success, true);
  });

  it("rechaza amount == 0", () => {
    const result = buildPaymentSchema.safeParse({
      merchantAddress: VALID_PUBKEY,
      payerPubkey: VALID_PUBKEY,
      amount: "0",
    });

    assert.equal(result.success, false);
  });

  it("rechaza amount negativo", () => {
    const result = buildPaymentSchema.safeParse({
      merchantAddress: VALID_PUBKEY,
      payerPubkey: VALID_PUBKEY,
      amount: "-100",
    });

    assert.equal(result.success, false);
  });

  it("rechaza un amount que no es un entero válido", () => {
    const result = buildPaymentSchema.safeParse({
      merchantAddress: VALID_PUBKEY,
      payerPubkey: VALID_PUBKEY,
      amount: "no-es-un-numero",
    });

    assert.equal(result.success, false);
  });

  it("rechaza direcciones que no parecen pubkeys de Solana", () => {
    const result = buildPaymentSchema.safeParse({
      merchantAddress: "corta",
      payerPubkey: VALID_PUBKEY,
      amount: "100",
    });

    assert.equal(result.success, false);
  });

  it("descarta campos desconocidos en vez de dejarlos pasar", () => {
    const result = buildPaymentSchema.safeParse({
      merchantAddress: VALID_PUBKEY,
      payerPubkey: VALID_PUBKEY,
      amount: "100",
      extraCampoNoPermitido: "algo",
    });

    assert.equal(result.success, true);
    if (result.success) {
      assert.equal("extraCampoNoPermitido" in result.data, false);
    }
  });
});

describe("solanaPaySchema", () => {
  it("reference es opcional", () => {
    const result = solanaPaySchema.safeParse({
      merchantAddress: VALID_PUBKEY,
      payerPubkey: VALID_PUBKEY,
      amount: "100",
    });

    assert.equal(result.success, true);
  });
});

describe("listPaymentsQuerySchema", () => {
  it("convierte limit de string (query param) a number", () => {
    const result = listPaymentsQuerySchema.safeParse({ limit: "25" });

    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.limit, 25);
    }
  });

  it("permite omitir todos los filtros", () => {
    const result = listPaymentsQuerySchema.safeParse({});
    assert.equal(result.success, true);
  });
});
