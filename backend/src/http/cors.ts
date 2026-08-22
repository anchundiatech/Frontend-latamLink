import type { NextFunction, Request, RequestHandler, Response } from "express";

// CORS mínimo y explícito: solo los orígenes declarados en ALLOWED_ORIGINS.
// Con "*" se permite cualquiera (útil en devnet; en producción se listan).
export function cors(allowedOrigins: string[]): RequestHandler {
  const allowAll = allowedOrigins.includes("*");

  return (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.headers.origin;
    if (origin && (allowAll || allowedOrigins.includes(origin))) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    // X-PAYMENT / X-PAYMENT-RESPONSE son las cabeceras del protocolo x402: sin
    // declararlas, ningún cliente x402 de navegador puede pagar.
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Api-Key, X-PAYMENT");
    res.setHeader("Access-Control-Expose-Headers", "X-PAYMENT-RESPONSE, Retry-After");
    res.setHeader("Access-Control-Max-Age", "86400");

    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  };
}
