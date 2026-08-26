import { strict as assert } from "node:assert";
import { describe, it, mock } from "node:test";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";

// catalogo.ts lee CATALOG_API_URL/CATALOG_RELAYER_KEY al importarse (son
// `const` de nivel superior, no se releen en cada llamada). En CI no hay
// .env real, así que sin esto el módulo aborta con "Falta configurar
// CATALOG_API_URL..." antes de que el fetch mockeado entre en juego. Se
// fijan acá y se importa dinámicamente para que corran después.
process.env.CATALOG_API_URL ??= "http://localhost:3002";
process.env.CATALOG_RELAYER_KEY ??= "clave-de-test";

const { conciliarTransferenciaDirecta } = await import("../src/events/transferenciaDirecta.js");
const { NATIVE_SOL_MINT } = await import("../src/solana/constants.js");

// El comercio recibe SOL nativo en su propia cuenta (sin ATA), así que el
// cobro se lee de preBalances/postBalances en vez de post/preTokenBalances.
// Antes de este test, un pago en SOL nunca se intentaba registrar.
function fakeAccountKeys(keys: PublicKey[]) {
  return { get: (i: number) => keys[i] };
}

function fakeConnectionConTx(params: {
  keys: PublicKey[];
  preBalances?: number[];
  postBalances?: number[];
  preTokenBalances?: unknown[];
  postTokenBalances?: unknown[];
}): Connection {
  const signature = "firma-de-prueba-".padEnd(64, "1");
  return {
    getSignaturesForAddress: async () => [{ signature, err: null }],
    getTransaction: async () => ({
      blockTime: 1_700_000_000,
      meta: {
        err: null,
        preBalances: params.preBalances ?? [],
        postBalances: params.postBalances ?? [],
        preTokenBalances: params.preTokenBalances ?? [],
        postTokenBalances: params.postTokenBalances ?? [],
        loadedAddresses: undefined,
      },
      transaction: {
        message: {
          getAccountKeys: () => fakeAccountKeys(params.keys),
        },
      },
    }),
  } as unknown as Connection;
}

const MERCHANT_ID = "merchant-uuid-1";
const TERMINAL_ID = "terminal-uuid-1";

function mockCatalogFetch(llamadas: { body?: Record<string, unknown> }[]) {
  return mock.method(globalThis, "fetch", async (url: string, init?: RequestInit) => {
    const path = String(url);
    if (path.includes("/api/merchants/pda/")) {
      return new Response(
        JSON.stringify({
          data: { id: MERCHANT_ID, terminals: [{ id: TERMINAL_ID, posTerminalId: "TERM-1" }] },
        }),
        { status: 200 },
      );
    }
    if (path.includes("/api/merchants/payment")) {
      const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : undefined;
      llamadas.push({ body });
      return new Response(JSON.stringify({ data: { id: "payment-1" } }), { status: 201 });
    }
    throw new Error(`fetch inesperado a ${path}`);
  });
}

describe("conciliarTransferenciaDirecta — SOL nativo", () => {
  it("registra el cobro leyendo el balance de lamports del comercio", async () => {
    const payer = Keypair.generate().publicKey;
    const owner = Keypair.generate().publicKey;
    const connection = fakeConnectionConTx({
      keys: [payer, owner],
      preBalances: [5_000_000_000, 1_000_000_000],
      postBalances: [4_899_995_000, 1_100_000_000], // el comercio recibió 0.1 SOL
    });

    const llamadas: { body?: Record<string, unknown> }[] = [];
    const fetchMock = mockCatalogFetch(llamadas);
    try {
      const resultado = await conciliarTransferenciaDirecta(connection, {
        reference: Keypair.generate().publicKey.toBase58(),
        merchantPda: Keypair.generate().publicKey.toBase58(),
        ownerPubkey: owner.toBase58(),
        mint: NATIVE_SOL_MINT,
      });

      assert.equal(resultado, "registrado");
      assert.equal(llamadas.length, 1);
      assert.equal(llamadas[0]!.body!.token, "SOL");
      assert.equal(llamadas[0]!.body!.amountGross, "100000000");
      assert.equal(llamadas[0]!.body!.payerPubkey, payer.toBase58());
    } finally {
      fetchMock.mock.restore();
    }
  });

  it("no registra nada si el balance del comercio no aumentó", async () => {
    const payer = Keypair.generate().publicKey;
    const owner = Keypair.generate().publicKey;
    const connection = fakeConnectionConTx({
      keys: [payer, owner],
      preBalances: [5_000_000_000, 1_000_000_000],
      postBalances: [4_999_995_000, 1_000_000_000], // sin cambios para el comercio
    });

    const llamadas: { body?: Record<string, unknown> }[] = [];
    const fetchMock = mockCatalogFetch(llamadas);
    try {
      const resultado = await conciliarTransferenciaDirecta(connection, {
        reference: Keypair.generate().publicKey.toBase58(),
        merchantPda: Keypair.generate().publicKey.toBase58(),
        ownerPubkey: owner.toBase58(),
        mint: NATIVE_SOL_MINT,
      });

      assert.equal(resultado, "monto-invalido");
      assert.equal(llamadas.length, 0);
    } finally {
      fetchMock.mock.restore();
    }
  });
});

describe("conciliarTransferenciaDirecta — token SPL", () => {
  it("sigue registrando transferencias de un token SPL (USDC) por postTokenBalances", async () => {
    const payer = Keypair.generate().publicKey;
    const owner = Keypair.generate().publicKey;
    const mint = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
    const { getAssociatedTokenAddressSync } = await import("@solana/spl-token");
    const cuentaComercio = getAssociatedTokenAddressSync(mint, owner);

    const connection = fakeConnectionConTx({
      keys: [payer, owner, cuentaComercio],
      preTokenBalances: [
        { accountIndex: 2, mint: mint.toBase58(), uiTokenAmount: { amount: "0" } },
      ],
      postTokenBalances: [
        { accountIndex: 2, mint: mint.toBase58(), uiTokenAmount: { amount: "1000000" } },
      ],
    });

    const llamadas: { body?: Record<string, unknown> }[] = [];
    const fetchMock = mockCatalogFetch(llamadas);
    try {
      const resultado = await conciliarTransferenciaDirecta(connection, {
        reference: Keypair.generate().publicKey.toBase58(),
        merchantPda: Keypair.generate().publicKey.toBase58(),
        ownerPubkey: owner.toBase58(),
        mint: mint.toBase58(),
      });

      assert.equal(resultado, "registrado");
      assert.equal(llamadas[0]!.body!.token, "USDC");
      assert.equal(llamadas[0]!.body!.amountGross, "1000000");
    } finally {
      fetchMock.mock.restore();
    }
  });
});
