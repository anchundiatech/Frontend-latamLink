import type { NextFunction, Request, Response } from 'express';
import { timingSafeEqual } from 'node:crypto';

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Exige una credencial de servicio en la cabecera `X-Api-Key`.
 *
 * Esta API administra comercios, terminales y el historial de cobros: sin
 * credencial, cualquiera con la URL podía crear, modificar o desactivar datos
 * de cualquier comercio. Si no hay ninguna clave configurada el endpoint se
 * cierra con 503 en lugar de quedar abierto.
 *
 * @param getKeys devuelve las claves aceptadas; se lee en cada request para
 * que el entorno pueda cargarse después de montar las rutas.
 */
export const requireApiKey = (getKeys: () => (string | undefined)[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const keys = getKeys().filter((k): k is string => Boolean(k));

    if (keys.length === 0) {
      return res.status(503).json({
        status: 'error',
        message:
          'Endpoint deshabilitado: falta configurar la credencial de servicio (API_KEY).',
      });
    }

    const provided = req.header('X-Api-Key') ?? '';
    if (!provided || !keys.some((key) => safeEqual(provided, key))) {
      return res
        .status(401)
        .json({ status: 'error', message: 'Credencial de servicio inválida o ausente' });
    }

    next();
  };
};

/** Credencial general de la API (backoffice y frontend del lado servidor). */
export const requireServiceKey = requireApiKey(() => [
  process.env.API_KEY,
  process.env.RELAYER_API_KEY,
]);

/**
 * Credencial exclusiva del relayer. El historial de pagos solo puede escribirlo
 * quien realmente firmó y envió la transacción: si lo pudiera escribir
 * cualquiera, se podrían inventar cobros confirmados que nunca ocurrieron.
 */
export const requireRelayerKey = requireApiKey(() => [process.env.RELAYER_API_KEY]);
