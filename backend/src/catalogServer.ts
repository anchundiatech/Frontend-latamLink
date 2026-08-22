import "dotenv/config";
import express, { type Express } from "express";
import { cors } from "./http/cors.js";
import { rateLimit } from "./http/rateLimit.js";
import merchantRoutes from "./routes/merchantRoutes.js";
import { ALLOWED_ORIGINS, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS, TRUSTED_PROXY_HOPS } from "./config.js";

function numberFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Configuración inválida: ${name}="${raw}" no es un número válido.`);
  }
  return value;
}

const API_PORT = numberFromEnv("API_PORT", 3002);

export function createCatalogApp(): Express {
  const app = express();
  app.set("trust proxy", TRUSTED_PROXY_HOPS);
  app.use(cors(ALLOWED_ORIGINS));
  app.use(express.json({ limit: "100kb" }));
  app.use(rateLimit({ windowMs: RATE_LIMIT_WINDOW_MS, max: RATE_LIMIT_MAX }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/merchants", merchantRoutes);

  return app;
}

const isMain = process.argv[1]?.endsWith("catalogServer.ts");
if (isMain) {
  createCatalogApp().listen(API_PORT, () => {
    console.log(`API de catálogo escuchando en :${API_PORT}`);
  });
}
