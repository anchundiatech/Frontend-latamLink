import "dotenv/config";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Un valor numérico mal escrito en .env ("100_000_000", "0.1 SOL") daba NaN, y
// toda comparación con NaN es false: el límite diario y el rate limiting se
// apagaban en silencio. Ahora el proceso no arranca con un número inválido.
function numberFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(
      `Configuración inválida: ${name}="${raw}" no es un número válido. ` +
        `Usá dígitos sin separadores (ej. ${fallback}).`,
    );
  }
  return value;
}

// RPC_URL acepta una lista separada por comas para failover de lectura (ver
// getFallbackConnections). El primero de la lista sigue siendo el endpoint
// principal, así que un solo RPC_URL sin comas se comporta exactamente igual
// que antes.
export const RPC_URLS = (process.env.RPC_URL ?? "https://api.devnet.solana.com")
  .split(",")
  .map((u) => u.trim())
  .filter(Boolean);
export const RPC_URL = RPC_URLS[0];
export const PORT = numberFromEnv("PORT", 3000);
// Puerto de la API de catálogo (Prisma/Postgres), servicio aparte del relayer.
export const API_PORT = numberFromEnv("API_PORT", 3002);
export const KEYS_DIR = process.env.KEYS_DIR ?? ".keys";
export const RELAYER_DAILY_LAMPORTS_CAP = numberFromEnv(
  "RELAYER_DAILY_LAMPORTS_CAP",
  100_000_000,
);

// Techo de fee de prioridad aceptado en una tx del cliente. Por defecto 0: el
// relayer no paga fees de prioridad que él no decidió (ver auditoría C1).
export const MAX_PRIORITY_MICROLAMPORTS = numberFromEnv("MAX_PRIORITY_MICROLAMPORTS", 0);

// Orígenes permitidos para el frontend (coma-separados). "*" en devnet.
export const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "*")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

export const RATE_LIMIT_WINDOW_MS = numberFromEnv("RATE_LIMIT_WINDOW_MS", 60_000);
export const RATE_LIMIT_MAX = numberFromEnv("RATE_LIMIT_MAX", 30);

// Cantidad de proxies propios delante del backend. Con "true" Express confía en
// cualquier X-Forwarded-For y el rate limiting se evade con una cabecera.
export const TRUSTED_PROXY_HOPS = numberFromEnv("TRUSTED_PROXY_HOPS", 0);

// Credencial de operador para el alta de comercios: ese endpoint gasta SOL de
// la plataforma y escribe estado on-chain permanente.
export const ADMIN_API_KEY = process.env.ADMIN_API_KEY ?? "";

// API de catálogo, para que el conciliador pueda registrar los cobros que se
// hacen por QR (esos los envía la billetera del cliente, no nosotros).
export const CATALOG_API_URL = process.env.CATALOG_API_URL ?? "";
export const CATALOG_RELAYER_KEY = process.env.CATALOG_RELAYER_KEY ?? "";

// URL pública del backend (para los QR de Solana Pay y el campo `resource`).
export const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL ?? `http://localhost:${PORT}`;

// Capa x402 (Fase 2). Sin facilitador ni tesorería la capa no se monta:
// preferimos no exponer un paywall que no puede verificar pagos.
export const X402_FACILITATOR_URL = process.env.X402_FACILITATOR_URL ?? "";
export const X402_TREASURY = process.env.X402_TREASURY ?? "";
export const X402_NETWORK = process.env.X402_NETWORK ?? "solana-devnet";
export const X402_ASSET = process.env.X402_ASSET ?? "";
export const X402_PRICE_QR = process.env.X402_PRICE_QR ?? "1000"; // 0.001 USDC
export const X402_PRICE_STATS = process.env.X402_PRICE_STATS ?? "5000"; // 0.005 USDC

export function isX402Configured(): boolean {
  return Boolean(X402_FACILITATOR_URL && X402_TREASURY && X402_ASSET);
}

export function getConnection(): Connection {
  return new Connection(RPC_URL, "confirmed");
}

// Conexiones a TODOS los RPC configurados, en orden. Pensadas solo para
// lecturas reintentables (por ejemplo, sondear el estado de una firma): un
// endpoint lento o caído durante la confirmación no debe traducirse en un
// falso "no se confirmó a tiempo" si otro RPC sí puede responder. Nunca se
// usan para reintentar un envío (sendRawTransaction): reintentar una
// escritura contra un RPC distinto es lo que puede terminar en un cobro
// duplicado, no lo que lo evita.
let cachedFallbackConnections: Connection[] | null = null;
export function getFallbackConnections(): Connection[] {
  if (!cachedFallbackConnections) {
    cachedFallbackConnections = RPC_URLS.map((url) => new Connection(url, "confirmed"));
  }
  return cachedFallbackConnections;
}

export function loadKeypair(name: string): Keypair {
  const path = join(KEYS_DIR, `${name}.json`);
  const secret = Uint8Array.from(JSON.parse(readFileSync(path, "utf8")));
  return Keypair.fromSecretKey(secret);
}

export function loadRelayer(): Keypair {
  return loadKeypair("relayer");
}

// Wallet de la plataforma: es el `owner` de todos los merchants y la única
// que puede retirar las comisiones del gas_vault (ver docs/MAPA_BACKEND.md).
export function loadPlatformOwner(): Keypair {
  return loadKeypair("owner");
}

// Pubkey de la plataforma sin necesidad de tocar el secreto. El relayer solo
// subsidia pagos a comercios nuestros: si el owner es otro, no hay comisión
// para la plataforma y el gas sería un regalo (auditoría H1).
let cachedPlatformOwner: PublicKey | null = null;
export function platformOwnerPubkey(): PublicKey {
  if (cachedPlatformOwner) return cachedPlatformOwner;
  const fromEnv = process.env.PLATFORM_OWNER_PUBKEY;
  cachedPlatformOwner = fromEnv
    ? new PublicKey(fromEnv)
    : loadPlatformOwner().publicKey;
  return cachedPlatformOwner;
}
