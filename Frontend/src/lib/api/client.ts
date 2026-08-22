// Thin typed client for the LatamLink Pay Express API.
//
// The frontend never calls the backend directly. It goes through the Next.js
// rewrite registered in next.config.ts at /backend-api, which proxies to the
// deployed API_URL. This avoids CORS and keeps the backend URL server-side.

const BASE = "/backend-api";

export type ApiStatus = "success" | "error";

export interface ApiEnvelope<T> {
  status: ApiStatus;
  data?: T;
  message?: string;
  errors?: unknown;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });

  const json = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!res.ok || !json || json.status === "error") {
    throw new ApiError(
      json?.message ?? "La solicitud al servidor falló",
      res.status,
      json,
    );
  }

  return json.data as T;
}

export interface MerchantOwner {
  id: string;
  pubkey: string;
  email?: string | null;
  name?: string | null;
  embeddedWalletPda: string;
  createdAt: string;
}

export interface MerchantOwnerPayload {
  pubkey: string;
  email?: string;
  name?: string;
  embeddedWalletPda: string;
}

export const api = {
  health: () =>
    request<{ status: string; message: string }>("/api/health"),

  createMerchantOwner: (body: MerchantOwnerPayload) =>
    request<MerchantOwner>("/api/merchants", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  createMerchant: (body: Record<string, unknown>) =>
    request("/api/merchants/store", { method: "POST", body: JSON.stringify(body) }),

  createTerminal: (body: Record<string, unknown>) =>
    request("/api/merchants/terminal", { method: "POST", body: JSON.stringify(body) }),

  createPayment: (body: Record<string, unknown>) =>
    request("/api/merchants/payment", { method: "POST", body: JSON.stringify(body) }),

  createDestination: (body: Record<string, unknown>) =>
    request("/api/merchants/destination", { method: "POST", body: JSON.stringify(body) }),

  getMerchantById: (id: string) =>
    request(`/api/merchants/${id}`),

  getPaymentsByMerchant: (id: string) =>
    request(`/api/merchants/${id}/payments`),
};

export default api;
