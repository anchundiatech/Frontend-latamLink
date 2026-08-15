import { Request, Response, NextFunction } from 'express';
import { z } from 'zod'; // Importamos todo el objeto z

// Usamos z.ZodTypeAny para aceptar cualquier tipo de esquema de Zod
export const validateSchema = (schema: z.ZodTypeAny) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({ status: 'error', errors: result.error.issues });
    }

    next();
  };
};