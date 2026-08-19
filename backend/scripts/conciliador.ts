// Registra en el historial los cobros que ocurren en la cadena.
//
// Uso:
//   pnpm run conciliador              → escucha en vivo
//   pnpm run conciliador -- --historico 200
//       → primero recupera los últimos 200 cobros y después escucha
//
// El barrido histórico sirve para recuperar lo que se haya perdido mientras el
// proceso estuvo caído: como el registro es idempotente, repetirlo no duplica.
import { getConnection } from "../src/config.js";
import { PROGRAM_ID } from "../src/solana/constants.js";
import { extractPaymentEvents } from "../src/events/paymentProcessed.js";
import { conciliarCobro, escucharCobros } from "../src/events/conciliador.js";

async function recuperarHistorico(limite: number): Promise<void> {
  const connection = getConnection();
  console.log(`Revisando los últimos ${limite} movimientos del programa…`);

  const firmas = await connection.getSignaturesForAddress(PROGRAM_ID, { limit: limite }, "confirmed");
  let registrados = 0;
  let yaEstaban = 0;

  for (const { signature, err } of firmas) {
    if (err) continue;

    const tx = await connection.getTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
    const logs = tx?.meta?.logMessages;
    if (!logs) continue;

    for (const evento of extractPaymentEvents(logs)) {
      try {
        const resultado = await conciliarCobro(evento, signature);
        if (resultado === "registrado") registrados++;
        if (resultado === "ya-estaba") yaEstaban++;
      } catch (err) {
        console.error(`No se pudo conciliar ${signature.slice(0, 12)}…:`, err);
      }
    }
  }

  console.log(`Histórico: ${registrados} cobro(s) recuperado(s), ${yaEstaban} ya estaban.`);
}

async function main(): Promise<void> {
  const indice = process.argv.indexOf("--historico");
  if (indice !== -1) {
    const limite = Number(process.argv[indice + 1] ?? 100);
    await recuperarHistorico(Number.isFinite(limite) && limite > 0 ? limite : 100);
  }

  const conciliador = await escucharCobros(getConnection());

  for (const señal of ["SIGINT", "SIGTERM"] as const) {
    process.on(señal, () => {
      void conciliador.detener().finally(() => process.exit(0));
    });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
