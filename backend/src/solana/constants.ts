import { PublicKey } from "@solana/web3.js";
import { createHash } from "node:crypto";

export const PROGRAM_ID = new PublicKey(
  "GSeGuv2K3meepgSHCehP5jGkRnjRZk96a9vsPSSJ7TjC",
);

export const MAX_DESTINATIONS = 10;

// El contrato con 10 destinos consume mucho CU (los tests usan 1M).
export const PAY_COMPUTE_UNIT_LIMIT = 1_000_000;

// Discriminador Anchor: sha256("global:<nombre_instruccion>")[0..8]
export function anchorDiscriminator(ixName: string): Buffer {
  return createHash("sha256").update(`global:${ixName}`).digest().subarray(0, 8);
}

export const PAY_DISCRIMINATOR = anchorDiscriminator("pay");
export const INITIALIZE_MERCHANT_DISCRIMINATOR =
  anchorDiscriminator("initialize_merchant");
export const WITHDRAW_GAS_FEES_DISCRIMINATOR =
  anchorDiscriminator("withdraw_gas_fees");
export const UPDATE_CONFIG_DISCRIMINATOR = anchorDiscriminator("update_config");
