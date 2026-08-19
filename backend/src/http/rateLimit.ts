import type { NextFunction, Request, RequestHandler, Response } from "express";

interface Bucket {
  count: number;
  resetAt: number;
}

// Ventana fija por IP (MVP en memoria; producción: redis compartido entre
// instancias). Protege al relayer de que una sola IP agote su SOL o sature
// el RPC — es la última pieza del checklist anti-abuso del informe (2.3.D).
export function rateLimit(options: {
  windowMs: number;
  max: number;
}): RequestHandler {
  const buckets = new Map<string, Bucket>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const key = req.ip ?? req.socket.remoteAddress ?? "desconocida";

    // Limpieza barata: se purgan las ventanas vencidas al pasar por aquí.
    if (buckets.size > 1000) {
      for (const [ip, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(ip);
      }
    }

    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      next();
      return;
    }

    bucket.count += 1;
    if (bucket.count > options.max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({
        error: `Demasiadas solicitudes. Reintenta en ${retryAfter}s`,
      });
      return;
    }
    next();
  };
}
