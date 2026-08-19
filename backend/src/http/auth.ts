import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

// Protege los endpoints de operador: dar de alta comercios gasta SOL de la
// plataforma y escribe estado on-chain que no se puede borrar, y el listado de
// pagos expone wallets y montos de terceros.
// Sin clave configurada el endpoint se cierra (503): nunca queda abierto.
export function requireOperator(apiKey: string): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!apiKey) {
      res.status(503).json({
        error: "Endpoint de operador deshabilitado: falta configurar ADMIN_API_KEY",
      });
      return;
    }

    const provided = req.header("X-Api-Key") ?? "";
    if (!provided || !safeEqual(provided, apiKey)) {
      res.status(401).json({ error: "Credencial de operador inválida o ausente" });
      return;
    }
    next();
  };
}
