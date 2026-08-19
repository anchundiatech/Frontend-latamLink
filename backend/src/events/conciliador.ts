import { Connection } from "@solana/web3.js";
import { PROGRAM_ID } from "../solana/constants.js";
import { extractPaymentEvents, type PaymentProcessedEvent } from "./paymentProcessed.js";
import { buscarComercioPorPda, registrarCobro } from "./catalogo.js";

/**
 * Registra en el historial los cobros que ocurren en la cadena.
 *
 * Hace falta porque el cobro por QR lo envía la billetera del cliente: nuestro
 * backend nunca ve esa transacción, así que sin esto el comercio no la ve en su
 * historial. Escuchando el evento del contrato quedan cubiertos todos los
 * cobros, vengan de donde vengan.
 *
 * Es idempotente: la firma es única en la base, así que un cobro que ya
 * registró el flujo dentro de la app simplemente se ignora.
 */
export async function conciliarCobro(
  evento: PaymentProcessedEvent,
  signature: string,
): Promise<"registrado" | "ya-estaba" | "sin-comercio"> {
  const comercio = await buscarComercioPorPda(evento.merchant.toBase58());
  if (!comercio) return "sin-comercio";

  // Se prefiere la terminal que emitió el cobro; si no coincide ninguna, la
  // primera activa, para no perder el registro por un detalle de nombre.
  const terminal =
    comercio.terminals?.find((t) => t.posTerminalId === evento.posTerminalId) ??
    comercio.terminals?.[0];
  if (!terminal) return "sin-comercio";

  const resultado = await registrarCobro({
    txSignature: signature,
    merchantId: comercio.id,
    posTerminalId: terminal.id,
    payerPubkey: evento.payer.toBase58(),
    amountGross: evento.amount.toString(),
    posFee: evento.posFee.toString(),
    gasFee: evento.gasFee.toString(),
    dust: evento.dust.toString(),
    // El contrato guarda el momento del cobro en segundos.
    timestamp: new Date(Number(evento.timestamp) * 1000).toISOString(),
    status: "CONFIRMED",
  });

  return resultado === null ? "ya-estaba" : "registrado";
}

export interface Conciliador {
  detener: () => Promise<void>;
}

/** Se suscribe a los cobros del programa y los va registrando. */
export async function escucharCobros(connection: Connection): Promise<Conciliador> {
  const suscripcion = connection.onLogs(
    PROGRAM_ID,
    (logs) => {
      if (logs.err) return; // una transacción fallida no mueve dinero

      for (const evento of extractPaymentEvents(logs.logs)) {
        void conciliarCobro(evento, logs.signature)
          .then((resultado) => {
            if (resultado === "registrado") {
              console.log(
                `cobro conciliado ${logs.signature.slice(0, 12)}… ` +
                  `(${evento.amount} del comercio ${evento.merchant.toBase58().slice(0, 8)}…)`,
              );
            }
            if (resultado === "sin-comercio") {
              console.warn(
                `cobro ignorado: el comercio ${evento.merchant.toBase58()} no está en la base`,
              );
            }
          })
          // Un fallo al registrar no puede tumbar la escucha: el cobro ya
          // ocurrió on-chain y se puede recuperar con el barrido histórico.
          .catch((err) => console.error("No se pudo conciliar el cobro:", err));
      }
    },
    "confirmed",
  );

  console.log(`Escuchando cobros del programa ${PROGRAM_ID.toBase58()}`);

  return {
    detener: async () => {
      await connection.removeOnLogsListener(suscripcion);
    },
  };
}
