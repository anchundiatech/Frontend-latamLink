import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

/**
 * Valida el cuerpo del request y **lo reemplaza por el resultado saneado**.
 *
 * Reemplazarlo es la parte importante: antes se validaba pero se seguía usando
 * `req.body` original, así que las claves no declaradas en el esquema llegaban
 * intactas al controlador. Con `data: req.body` eso permitía escribir campos
 * que nunca deberían venir de fuera (por ejemplo el `accessToken` de una
 * terminal, que es su credencial). Zod descarta las claves desconocidas, así
 * que el controlador solo ve campos previstos, ya con sus valores por defecto.
 */
export const validateSchema = (schema: z.ZodTypeAny) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({ status: 'error', errors: result.error.issues });
    }

    req.body = result.data;
    next();
  };
};
