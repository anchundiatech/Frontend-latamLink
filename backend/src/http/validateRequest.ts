import type { NextFunction, Request, Response } from "express";
import type { z } from "zod";

// Mismo espíritu que middleware/validateSchema.ts (Zod, reemplaza el input
// crudo por el saneado) pero con la forma de error que ya usan las rutas del
// relayer ({ error: string }), para no romper el parseo de error que hace
// Frontend/src/lib/api/relayer.ts.
function issuesToMessage(issues: z.ZodIssue[]): string {
  return issues.map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`).join("; ");
}

export function validateBody(schema: z.ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      res.status(400).json({ error: issuesToMessage(result.error.issues) });
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: z.ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query ?? {});
    if (!result.success) {
      res.status(400).json({ error: issuesToMessage(result.error.issues) });
      return;
    }
    // req.query es de solo lectura en Express 5; el resultado saneado se
    // expone aparte para que el handler lo use en vez de req.query crudo.
    (req as Request & { validatedQuery: unknown }).validatedQuery = result.data;
    next();
  };
}
