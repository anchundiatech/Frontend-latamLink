import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { Facilitator } from "./facilitator.js";
import {
  FacilitatorUnavailableError,
  X402_VERSION,
  type PaymentPayload,
  type PaymentRequirements,
} from "./types.js";

export interface PreconditionResult {
  ok: boolean;
  status?: number;
  error?: string;
}

export interface PaywallOptions {
  facilitator: Facilitator;
  baseUrl: string; // URL pública propia: nunca la cabecera Host del cliente
  network: string;
  asset: string; // mint del token de pago
  payTo: string; // tesorería x402
  price: string; // unidades mínimas
  description: string;
  maxTimeoutSeconds?: number;
  retryAfterSeconds?: number;
  // Se ejecuta ANTES de cobrar: si el request no se va a poder servir, no se
  // le cobra al cliente por un error nuestro.
  precondition?: (req: Request) => Promise<PreconditionResult>;
  isRedeemed?: (transaction: string) => boolean;
  onSettled?: (receipt: {
    resource: string;
    amount: string;
    payer: string | null;
    transaction: string | null;
  }) => void;
}

function decodePaymentHeader(header: string): PaymentPayload {
  const json = Buffer.from(header, "base64").toString("utf8");
  const parsed = JSON.parse(json) as PaymentPayload;
  if (!parsed || typeof parsed !== "object" || typeof parsed.scheme !== "string") {
    throw new Error("Estructura de X-PAYMENT inválida");
  }
  return parsed;
}

// Transacciones ya canjeadas en este proceso. Complementa la comprobación
// persistida para cerrar la ventana entre dos requests simultáneos.
const redeemedInFlight = new Set<string>();

// REGLA INNEGOCIABLE del proyecto: el recurso no se entrega jamás sin una
// verificación de pago confirmada. Cualquier duda —header ausente, malformado,
// pago inválido, ya canjeado, liquidación fallida o facilitador caído—
// termina SIN recurso.
export function requirePayment(options: PaywallOptions): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const resource = `${options.baseUrl.replace(/\/$/, "")}${req.originalUrl}`;
    const requirements: PaymentRequirements = {
      scheme: "exact",
      network: options.network,
      maxAmountRequired: options.price,
      resource,
      description: options.description,
      mimeType: "application/json",
      payTo: options.payTo,
      maxTimeoutSeconds: options.maxTimeoutSeconds ?? 60,
      asset: options.asset,
    };

    const paymentRequired = (error: string): void => {
      res.status(402).json({ x402Version: X402_VERSION, accepts: [requirements], error });
    };

    // Primero, ¿podemos servir esto? Cobrar y después fallar con 4xx sería
    // quedarnos con el dinero del cliente sin darle nada.
    if (options.precondition) {
      const check = await options.precondition(req);
      if (!check.ok) {
        res.status(check.status ?? 400).json({ error: check.error ?? "Solicitud inválida" });
        return;
      }
    }

    const header = req.header("X-PAYMENT");
    if (!header) {
      paymentRequired("Pago requerido: reintenta con la cabecera X-PAYMENT");
      return;
    }

    let payload: PaymentPayload;
    try {
      payload = decodePaymentHeader(header);
    } catch (err) {
      paymentRequired(`Cabecera X-PAYMENT ilegible: ${(err as Error).message}`);
      return;
    }

    // Validación propia antes de delegar: no confiamos en que el facilitador
    // rechace un esquema o una red que no son los que pedimos.
    if (payload.scheme !== requirements.scheme) {
      paymentRequired(`Esquema de pago no soportado: ${payload.scheme}`);
      return;
    }
    if (payload.network !== requirements.network) {
      paymentRequired(`Red de pago no soportada: ${payload.network}`);
      return;
    }

    try {
      const verification = await options.facilitator.verify(payload, requirements);
      if (!verification.isValid) {
        paymentRequired(verification.invalidReason ?? "El pago no es válido");
        return;
      }

      const settlement = await options.facilitator.settle(payload, requirements);
      if (!settlement.success) {
        paymentRequired(settlement.errorReason ?? "No se pudo liquidar el pago");
        return;
      }

      // Un mismo pago no puede canjearse dos veces.
      const transaction = settlement.transaction ?? null;
      if (transaction) {
        if (redeemedInFlight.has(transaction) || options.isRedeemed?.(transaction)) {
          paymentRequired("Este pago ya fue utilizado");
          return;
        }
        redeemedInFlight.add(transaction);
      }

      res.setHeader(
        "X-PAYMENT-RESPONSE",
        Buffer.from(JSON.stringify(settlement)).toString("base64"),
      );

      // Comprobante para la liquidación híbrida (Fase 3): la tesorería x402
      // cobra con el esquema estándar y después se reparte vía pay().
      options.onSettled?.({
        resource,
        amount: options.price,
        payer: settlement.payer ?? verification.payer ?? null,
        transaction,
      });

      next();
    } catch (err) {
      if (err instanceof FacilitatorUnavailableError) {
        const retryAfter = options.retryAfterSeconds ?? 30;
        res.setHeader("Retry-After", String(retryAfter));
        res.status(503).json({
          error: `Servicio de verificación de pagos no disponible: ${err.message}`,
        });
        return;
      }
      paymentRequired(`No se pudo verificar el pago: ${(err as Error).message}`);
    }
  };
}
