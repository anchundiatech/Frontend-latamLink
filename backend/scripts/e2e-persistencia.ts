// Comprueba que la base sea de verdad la fuente de verdad:
//   1. Recupera el comercio por la wallet del comerciante (lo que hace la app
//      al entrar desde otro dispositivo).
//   2. Cobra con el flujo sin gas de la app (build → firma → submit).
//   3. Verifica que el cobro quedó en el historial con su desglose exacto.
import { Transaction } from "@solana/web3.js";
import { loadKeypair } from "../src/config.js";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const OWNER = process.env.OWNER_PUBKEY ?? "";
const AMOUNT = "3000000"; // 3 unidades del token de prueba

interface Merchant {
  id: string;
  name: string;
  pdaAddress: string;
  feeBps: number;
  posFeeBps: number;
  destinations?: { destinationPubkey: string; percentage: number; description: string | null }[];
  terminals?: { posTerminalId: string }[];
}

async function main(): Promise<void> {
  if (!OWNER) throw new Error("Falta OWNER_PUBKEY");
  const user = loadKeypair("user");

  // 1. Recuperar el comercio como lo haría la app en un navegador nuevo.
  const ownerRes = await fetch(`${APP_URL}/api/merchants?owner=${OWNER}`);
  if (!ownerRes.ok) throw new Error(`no se recuperó el comercio: ${await ownerRes.text()}`);
  const owner = (await ownerRes.json()) as { merchants: Merchant[] };
  const merchant = owner.merchants[0];
  if (!merchant) throw new Error("el dueño no tiene comercios");

  console.log(`comercio recuperado de la base: "${merchant.name}" (${merchant.pdaAddress})`);
  console.log(
    `  destinos: ${merchant.destinations
      ?.map((d) => `${d.description ?? "sin etiqueta"} ${d.percentage}%`)
      .join(", ")}`,
  );
  console.log(`  terminal: ${merchant.terminals?.[0]?.posTerminalId}`);

  // 2. Cobrar con el flujo sin gas.
  const buildRes = await fetch(`${APP_URL}/api/payments/build`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      merchantAddress: merchant.pdaAddress,
      payerPubkey: user.publicKey.toBase58(),
      amount: AMOUNT,
    }),
  });
  const built = (await buildRes.json()) as { transaction?: string; error?: string };
  if (!buildRes.ok || !built.transaction) throw new Error(built.error ?? "no se armó la tx");

  const tx = Transaction.from(Buffer.from(built.transaction, "base64"));
  tx.partialSign(user);

  const submitRes = await fetch(`${APP_URL}/api/payments/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      transaction: tx
        .serialize({ requireAllSignatures: false, verifySignatures: false })
        .toString("base64"),
    }),
  });
  const submitted = (await submitRes.json()) as {
    signature?: string;
    error?: string;
    warning?: string;
  };
  if (!submitRes.ok || !submitted.signature) throw new Error(submitted.error ?? "no se envió");
  if (submitted.warning) throw new Error(`se cobró pero no se guardó: ${submitted.warning}`);
  console.log(`cobro confirmado: ${submitted.signature.slice(0, 16)}…`);

  // 3. Comprobar que quedó en el historial con el desglose correcto.
  const historialRes = await fetch(`${APP_URL}/api/payments?merchantId=${merchant.id}`);
  const { payments } = (await historialRes.json()) as {
    payments: {
      txSignature: string;
      amountGross: string;
      posFee: string;
      gasFee: string;
      dust: string;
      status: string;
      terminal?: { posTerminalId: string };
    }[];
  };

  const registrado = payments.find((p) => p.txSignature === submitted.signature);
  if (!registrado) throw new Error("el cobro no aparece en el historial");

  const amount = BigInt(AMOUNT);
  const posFeeEsperado = (amount * BigInt(merchant.posFeeBps)) / 10_000n;
  const gasFeeEsperado = ((amount - posFeeEsperado) * BigInt(merchant.feeBps)) / 10_000n;

  const checks: [string, string, string][] = [
    ["monto", registrado.amountGross, amount.toString()],
    ["comisión POS", registrado.posFee, posFeeEsperado.toString()],
    ["comisión gas", registrado.gasFee, gasFeeEsperado.toString()],
    ["estado", registrado.status, "CONFIRMED"],
    ["terminal", registrado.terminal?.posTerminalId ?? "", merchant.terminals?.[0]?.posTerminalId ?? ""],
  ];

  let ok = true;
  for (const [label, got, expected] of checks) {
    const mark = got === expected ? "✓" : "✗";
    if (got !== expected) ok = false;
    console.log(`  ${label}: ${got} (esperado ${expected}) ${mark}`);
  }

  if (!ok) throw new Error("el historial no coincide con lo cobrado");
  console.log(`\nPERSISTENCIA OK ✓ — ${payments.length} cobro(s) en el historial del comercio`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
