import { CATALOG_API_URL, CATALOG_RELAYER_KEY } from "../config.js";

/**
 * Cliente mínimo de la API de catálogo, usado por el conciliador.
 *
 * Solo necesita dos cosas: encontrar el comercio por su dirección on-chain y
 * registrar el cobro. Escribir en el historial exige la credencial del relayer,
 * que es justo lo que impide que se puedan inventar cobros.
 */
export interface ComercioDelCatalogo {
  id: string;
  terminals?: { id: string; posTerminalId: string }[];
}

export class CatalogoNoDisponible extends Error {}

async function pedir<T>(path: string, init?: RequestInit): Promise<T | null> {
  if (!CATALOG_API_URL || !CATALOG_RELAYER_KEY) {
    throw new CatalogoNoDisponible(
      "Falta configurar CATALOG_API_URL y CATALOG_RELAYER_KEY para conciliar cobros",
    );
  }

  const res = await fetch(`${CATALOG_API_URL.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": CATALOG_RELAYER_KEY,
      ...(init?.headers ?? {}),
    },
  });

  if (res.status === 404) return null;
  // El historial tiene la firma como única: un cobro ya registrado responde 409
  // y no es un error — significa que otro camino se nos adelantó.
  if (res.status === 409) return null;

  if (!res.ok) {
    const cuerpo = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(cuerpo.message ?? `La API de catálogo respondió ${res.status}`);
  }

  return ((await res.json()) as { data: T }).data;
}

export function buscarComercioPorPda(pda: string): Promise<ComercioDelCatalogo | null> {
  return pedir<ComercioDelCatalogo>(`/api/merchants/pda/${pda}`);
}

export function registrarCobro(pago: {
  txSignature: string;
  merchantId: string;
  posTerminalId: string;
  payerPubkey: string;
  amountGross: string;
  posFee: string;
  gasFee: string;
  dust: string;
  timestamp: string;
  status: "CONFIRMED";
}): Promise<unknown> {
  return pedir("/api/merchants/payment", { method: "POST", body: JSON.stringify(pago) });
}
