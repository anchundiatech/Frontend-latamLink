// Prepara el entorno de prueba en devnet: keypairs, SOL, mint de prueba (USDC
// de 6 decimales propio, para poder mintear sin depender del faucet de Circle),
// ATAs, fondos del usuario y un merchant demo inicializado.
// Idempotente: reusa keypairs/mint/merchant si ya existen en devnet-state.json.
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createMint,
  getAssociatedTokenAddressSync,
  mintTo,
} from "@solana/spl-token";
import {
  createCreateMetadataAccountV3Instruction,
  PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID,
} from "@metaplex-foundation/mpl-token-metadata";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getConnection, KEYS_DIR } from "../src/config.js";
import { buildInitializeMerchantInstruction } from "../src/solana/instructions.js";
import { deriveMerchantPda, fetchMerchant } from "../src/solana/merchant.js";

const STATE_PATH = "devnet-state.json";
const USDC_DECIMALS = 6;

interface DevnetState {
  mint: string;
  merchantAddress: string;
  merchantId: string;
  ownerPubkey: string;
  destinationWallets: string[];
  [k: string]: unknown;
}

function loadOrCreateKeypair(name: string): Keypair {
  const path = join(KEYS_DIR, `${name}.json`);
  if (existsSync(path)) {
    return Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(readFileSync(path, "utf8"))),
    );
  }
  const kp = Keypair.generate();
  writeFileSync(path, JSON.stringify(Array.from(kp.secretKey)), { mode: 0o600 });
  console.log(`Keypair ${name} creado: ${kp.publicKey.toBase58()}`);
  return kp;
}

// Sin esto, el mint de prueba no tiene nombre ni símbolo en ningún lado: las
// wallets (Phantom, Solflare) no lo reconocen como "USDC" y algunas se cuelgan
// calculando la comisión en vez de mostrarlo como token desconocido. Solo el
// dueño de la mint authority puede crear esta cuenta, por eso no se puede
// hacer sobre un mint de USDC-Dev compartido que no creamos nosotros.
async function ensureTokenMetadata(
  connection: Connection,
  owner: Keypair,
  mint: PublicKey,
): Promise<void> {
  const [metadataPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    TOKEN_METADATA_PROGRAM_ID,
  );

  if (await connection.getAccountInfo(metadataPda)) {
    console.log(`Metadata del mint ya existe: ${metadataPda.toBase58()}`);
    return;
  }

  const ix = createCreateMetadataAccountV3Instruction(
    {
      metadata: metadataPda,
      mint,
      mintAuthority: owner.publicKey,
      payer: owner.publicKey,
      updateAuthority: owner.publicKey,
    },
    {
      createMetadataAccountArgsV3: {
        data: {
          name: "USDC (Dev)",
          symbol: "USDC",
          uri: "",
          sellerFeeBasisPoints: 0,
          creators: null,
          collection: null,
          uses: null,
        },
        isMutable: true,
        collectionDetails: null,
      },
    },
  );

  const sig = await sendAndConfirmTransaction(connection, new Transaction().add(ix), [owner]);
  console.log(`Metadata del mint creada: ${metadataPda.toBase58()} (tx ${sig.slice(0, 8)}…)`);
}

async function ensureSol(
  connection: Connection,
  pubkey: PublicKey,
  minSol: number,
): Promise<void> {
  const balance = await connection.getBalance(pubkey);
  if (balance >= minSol * LAMPORTS_PER_SOL) {
    console.log(`${pubkey.toBase58()}: ${balance / LAMPORTS_PER_SOL} SOL ✓`);
    return;
  }
  console.log(`${pubkey.toBase58()}: pidiendo airdrop...`);
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const sig = await connection.requestAirdrop(pubkey, 2 * LAMPORTS_PER_SOL);
      await connection.confirmTransaction(sig, "confirmed");
      console.log(`Airdrop OK (${sig.slice(0, 8)}…)`);
      return;
    } catch (err) {
      console.warn(`Airdrop intento ${attempt} falló: ${(err as Error).message}`);
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
  throw new Error(
    `Sin SOL para ${pubkey.toBase58()}. Fondea manualmente en https://faucet.solana.com y reintenta.`,
  );
}

async function main(): Promise<void> {
  mkdirSync(KEYS_DIR, { recursive: true });
  const connection = getConnection();

  const relayer = loadOrCreateKeypair("relayer");
  const owner = loadOrCreateKeypair("owner");
  const user = loadOrCreateKeypair("user");
  const destA = loadOrCreateKeypair("dest-a");
  const destB = loadOrCreateKeypair("dest-b");

  await ensureSol(connection, relayer.publicKey, 0.2);
  await ensureSol(connection, owner.publicKey, 0.2);
  // El usuario NO recibe SOL: la regla de negocio es que nunca lo necesita.

  let state: Partial<DevnetState> = {};
  if (existsSync(STATE_PATH)) {
    state = JSON.parse(readFileSync(STATE_PATH, "utf8"));
  }

  // 1. Mint de prueba (equivalente a USDC, con authority = owner)
  let mint: PublicKey;
  if (state.mint && (await connection.getAccountInfo(new PublicKey(state.mint)))) {
    mint = new PublicKey(state.mint);
    console.log(`Mint reutilizado: ${mint.toBase58()}`);
  } else {
    mint = await createMint(connection, owner, owner.publicKey, null, USDC_DECIMALS);
    console.log(`Mint creado: ${mint.toBase58()}`);
  }

  await ensureTokenMetadata(connection, owner, mint);

  // 2. ATAs: usuario (paga), owner (pos_fee_destination), destinos A y B
  const atas = {
    user: getAssociatedTokenAddressSync(mint, user.publicKey),
    posFee: getAssociatedTokenAddressSync(mint, owner.publicKey),
    destA: getAssociatedTokenAddressSync(mint, destA.publicKey),
    destB: getAssociatedTokenAddressSync(mint, destB.publicKey),
  };
  const ataTx = new Transaction();
  for (const [ownerKey, ata] of [
    [user.publicKey, atas.user],
    [owner.publicKey, atas.posFee],
    [destA.publicKey, atas.destA],
    [destB.publicKey, atas.destB],
  ] as const) {
    ataTx.add(
      createAssociatedTokenAccountIdempotentInstruction(
        owner.publicKey,
        ata,
        ownerKey,
        mint,
      ),
    );
  }
  await sendAndConfirmTransaction(connection, ataTx, [owner]);
  console.log("ATAs listas ✓");

  // 3. Fondos de prueba para el usuario: 1.000 USDC-test
  await mintTo(connection, owner, mint, atas.user, owner, 1_000n * 10n ** 6n);
  console.log(`Usuario fondeado con 1000 USDC-test (${atas.user.toBase58()})`);

  // 4. Merchant demo: 1% gas fee, 0.5% POS fee, mínimo 0.01, split 60/40
  let merchantAddress: PublicKey;
  let merchantId: bigint;
  if (
    state.merchantAddress &&
    (await connection.getAccountInfo(new PublicKey(state.merchantAddress)))
  ) {
    merchantAddress = new PublicKey(state.merchantAddress);
    merchantId = BigInt(state.merchantId!);
    console.log(`Merchant reutilizado: ${merchantAddress.toBase58()}`);
  } else {
    merchantId = BigInt(Date.now());
    merchantAddress = deriveMerchantPda(owner.publicKey, merchantId);
    const initIx = buildInitializeMerchantInstruction({
      owner: owner.publicKey,
      paymentTokenMint: mint,
      merchantId,
      feeBps: 100,
      posFeeBps: 50,
      minPaymentAmount: 10_000n, // 0.01 USDC
      destinations: [atas.destA, atas.destB],
      percentages: [60, 40],
      posTerminalId: "TERM-DEMO-001",
    });
    const initTx = new Transaction().add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
      initIx,
    );
    const sig = await sendAndConfirmTransaction(connection, initTx, [owner]);
    console.log(`Merchant inicializado: ${merchantAddress.toBase58()} (tx ${sig.slice(0, 8)}…)`);
  }

  const merchant = await fetchMerchant(connection, merchantAddress);
  console.log(
    `Merchant on-chain ✓ activo=${merchant.isActive} destinos=${merchant.destinations.length} ` +
      `fee=${merchant.feeBps}bps posFee=${merchant.posFeeBps}bps`,
  );

  const newState: DevnetState = {
    mint: mint.toBase58(),
    merchantAddress: merchantAddress.toBase58(),
    merchantId: merchantId.toString(),
    ownerPubkey: owner.publicKey.toBase58(),
    relayerPubkey: relayer.publicKey.toBase58(),
    userPubkey: user.publicKey.toBase58(),
    userAta: atas.user.toBase58(),
    posFeeAta: atas.posFee.toBase58(),
    destinationWallets: [atas.destA.toBase58(), atas.destB.toBase58()],
  };
  writeFileSync(STATE_PATH, JSON.stringify(newState, null, 2));
  console.log(`Estado guardado en ${STATE_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
