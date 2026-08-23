import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import type { Request, Response } from "express";
import { requirePayment } from "../src/x402/middleware.js";
import type { Facilitator } from "../src/x402/facilitator.js";
import {
  FacilitatorUnavailableError,
  type PaymentRequiredBody,
  type SettleResponse,
  type VerifyResponse,
} from "../src/x402/types.js";

const TREASURY = "5rF3sTreasuryAddressForTestsOnly1111111111";
const ASSET = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
const PRICE = "5000";

interface Captured {
  statusCode: number | null;
  body: unknown;
  headers: Record<string, string>;
  delivered: boolean;
  settledReceipts: unknown[];
}

function fakeFacilitator(behaviour: {
  verify?: VerifyResponse | Error;
  settle?: SettleResponse | Error;
  calls?: string[];
}): Facilitator {
  return {
    async verify() {
      behaviour.calls?.push("verify");
      if (behaviour.verify instanceof Error) throw behaviour.verify;
      return behaviour.verify ?? { isValid: true, payer: "PayerPubkey" };
    },
    async settle() {
      behaviour.calls?.push("settle");
      if (behaviour.settle instanceof Error) throw behaviour.settle;
      return behaviour.settle ?? { success: true, transaction: "sig123", payer: "PayerPubkey" };
    },
  };
}

async function callPaywall(
  facilitator: Facilitator,
  paymentHeader?: string,
  extra?: {
    isRedeemed?: (transaction: string) => Promise<boolean>;
    precondition?: () => Promise<{ ok: boolean; status?: number; error?: string }>;
  },
): Promise<Captured> {
  const captured: Captured = {
    statusCode: null,
    body: null,
    headers: {},
    delivered: false,
    settledReceipts: [],
  };

  const middleware = requirePayment({
    facilitator,
    baseUrl: "https://api.latamlink.test",
    network: "solana-devnet",
    asset: ASSET,
    payTo: TREASURY,
    price: PRICE,
    description: "Estadísticas de comercio",
    isRedeemed: extra?.isRedeemed,
    precondition: extra?.precondition,
    onSettled: (receipt) => captured.settledReceipts.push(receipt),
  });

  const req = {
    // Host y protocolo vienen del cliente: el middleware NO debe usarlos.
    protocol: "http",
    originalUrl: "/x402/merchants/abc/stats",
    get: () => "atacante.example.com",
    header: (name: string) =>
      name.toLowerCase() === "x-payment" ? paymentHeader : undefined,
  } as unknown as Request;

  const res = {
    setHeader: (name: string, value: string) => {
      captured.headers[name] = value;
    },
    status: (code: number) => {
      captured.statusCode = code;
      return res;
    },
    json: (payload: unknown) => {
      captured.body = payload;
      return res;
    },
  } as unknown as Response;

  await middleware(req, res, () => {
    captured.delivered = true;
  });

  return captured;
}

function encodePayment(payload: unknown): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

const VALID_PAYMENT = encodePayment({
  x402Version: 1,
  scheme: "exact",
  network: "solana-devnet",
  payload: { transaction: "base64tx" },
});

describe("x402 — el recurso nunca se entrega sin pago verificado", () => {
  it("responde 402 con los requisitos de pago cuando no hay cabecera X-PAYMENT", async () => {
    const result = await callPaywall(fakeFacilitator({}));

    assert.equal(result.statusCode, 402);
    assert.equal(result.delivered, false);

    const body = result.body as PaymentRequiredBody;
    assert.equal(body.x402Version, 1);
    assert.equal(body.accepts.length, 1);
    assert.equal(body.accepts[0]?.scheme, "exact");
    assert.equal(body.accepts[0]?.payTo, TREASURY);
    assert.equal(body.accepts[0]?.asset, ASSET);
    assert.equal(body.accepts[0]?.maxAmountRequired, PRICE);
    assert.equal(
      body.accepts[0]?.resource,
      "https://api.latamlink.test/x402/merchants/abc/stats",
    );
  });

  it("responde 402 sin consultar al facilitador si la cabecera es ilegible", async () => {
    const calls: string[] = [];
    const result = await callPaywall(fakeFacilitator({ calls }), "no-es-base64-json");

    assert.equal(result.statusCode, 402);
    assert.equal(result.delivered, false);
    assert.deepEqual(calls, []);
  });

  it("responde 402 y no liquida si el facilitador declara el pago inválido", async () => {
    const calls: string[] = [];
    const result = await callPaywall(
      fakeFacilitator({ calls, verify: { isValid: false, invalidReason: "monto insuficiente" } }),
      VALID_PAYMENT,
    );

    assert.equal(result.statusCode, 402);
    assert.equal(result.delivered, false);
    assert.deepEqual(calls, ["verify"], "no debe intentar liquidar un pago inválido");
    assert.match((result.body as PaymentRequiredBody).error, /monto insuficiente/);
  });

  it("no entrega el recurso si la liquidación falla", async () => {
    const result = await callPaywall(
      fakeFacilitator({ settle: { success: false, errorReason: "fondos insuficientes" } }),
      VALID_PAYMENT,
    );

    assert.equal(result.statusCode, 402);
    assert.equal(result.delivered, false);
    assert.equal(result.settledReceipts.length, 0);
  });

  it("degrada con 503 y Retry-After si el facilitador no responde", async () => {
    const result = await callPaywall(
      fakeFacilitator({ verify: new FacilitatorUnavailableError("timeout") }),
      VALID_PAYMENT,
    );

    assert.equal(result.statusCode, 503);
    assert.equal(result.delivered, false);
    assert.ok(result.headers["Retry-After"], "falta la cabecera Retry-After");
  });

  it("no cobra si el request no se va a poder servir", async () => {
    const calls: string[] = [];
    const result = await callPaywall(fakeFacilitator({ calls }), VALID_PAYMENT, {
      precondition: async () => ({ ok: false, status: 422, error: "El comercio está inactivo" }),
    });

    assert.equal(result.statusCode, 422);
    assert.equal(result.delivered, false);
    assert.deepEqual(calls, [], "no debe cobrarse un request que no se puede servir");
  });

  it("rechaza un pago ya canjeado (replay de la cabecera X-PAYMENT)", async () => {
    const result = await callPaywall(fakeFacilitator({}), VALID_PAYMENT, {
      isRedeemed: async (transaction) => transaction === "sig123",
    });

    assert.equal(result.statusCode, 402);
    assert.equal(result.delivered, false);
    assert.match((result.body as PaymentRequiredBody).error, /ya fue utilizado/i);
  });

  it("rechaza un pago de otra red o esquema sin consultar al facilitador", async () => {
    const calls: string[] = [];
    const otraRed = encodePayment({
      x402Version: 1,
      scheme: "exact",
      network: "base-sepolia",
      payload: {},
    });
    const result = await callPaywall(fakeFacilitator({ calls }), otraRed);

    assert.equal(result.statusCode, 402);
    assert.equal(result.delivered, false);
    assert.deepEqual(calls, []);
  });

  it("entrega el recurso y deja comprobante cuando el pago se verifica y liquida", async () => {
    const calls: string[] = [];
    const result = await callPaywall(fakeFacilitator({ calls }), VALID_PAYMENT);

    assert.equal(result.delivered, true, "el recurso debía entregarse");
    assert.equal(result.statusCode, null, "no debe escribirse un estado de error");
    assert.deepEqual(calls, ["verify", "settle"]);
    assert.ok(result.headers["X-PAYMENT-RESPONSE"], "falta X-PAYMENT-RESPONSE");
    assert.equal(result.settledReceipts.length, 1);
    assert.deepEqual(result.settledReceipts[0], {
      resource: "https://api.latamlink.test/x402/merchants/abc/stats",
      amount: PRICE,
      payer: "PayerPubkey",
      transaction: "sig123",
    });
  });
});
