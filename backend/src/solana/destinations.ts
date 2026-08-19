import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";

/**
 * Traduce lo que escribe el comerciante a lo que exige el contrato.
 *
 * El contrato reparte hacia **cuentas de token**, pero una persona conoce su
 * dirección de wallet, no su cuenta asociada de un mint concreto. Antes había
 * que pegar la cuenta de token a mano y, si te equivocabas, el alta fallaba con
 * "no es una cuenta de token válida": justo el tipo de detalle cripto que el
 * comerciante no debería tener que entender.
 *
 * Ahora se acepta cualquiera de las dos cosas:
 *   - una cuenta de token del mint correcto → se usa tal cual;
 *   - una dirección de wallet → se deriva su cuenta asociada y, si todavía no
 *     existe, la crea la plataforma (paga la renta, como el resto del alta).
 */
export interface DestinosResueltos {
  cuentas: PublicKey[];
  creadas: PublicKey[];
}

export async function resolverDestinos(params: {
  connection: Connection;
  pagadorDeRenta: Keypair;
  mint: PublicKey;
  direcciones: string[];
  vault: PublicKey;
  gasVault: PublicKey;
}): Promise<DestinosResueltos> {
  const { connection, pagadorDeRenta, mint, direcciones, vault, gasVault } = params;

  const cuentas: PublicKey[] = [];
  const porCrear: { cuenta: PublicKey; dueño: PublicKey }[] = [];

  for (const direccion of direcciones) {
    let key: PublicKey;
    try {
      key = new PublicKey(direccion);
    } catch {
      throw new Error(`"${direccion}" no es una dirección de Solana válida`);
    }

    if (key.equals(vault) || key.equals(gasVault)) {
      throw new Error(`El destino ${direccion} no puede ser el vault ni el gas_vault`);
    }

    const info = await connection.getParsedAccountInfo(key);
    const esCuentaDeToken =
      info.value !== null && info.value.owner.equals(TOKEN_PROGRAM_ID);

    if (esCuentaDeToken) {
      const data = info.value!.data;
      const mintDelDestino =
        typeof data === "object" && "parsed" in data
          ? (data.parsed?.info?.mint as string | undefined)
          : undefined;

      if (mintDelDestino !== mint.toBase58()) {
        throw new Error(
          `La cuenta ${direccion} es del token ${mintDelDestino ?? "desconocido"}, ` +
            `y este comercio cobra en ${mint.toBase58()}`,
        );
      }

      cuentas.push(key);
      continue;
    }

    // No es cuenta de token: se trata como wallet y se usa su cuenta asociada.
    let asociada: PublicKey;
    try {
      asociada = getAssociatedTokenAddressSync(mint, key);
    } catch {
      throw new Error(
        `${direccion} no puede recibir pagos: no es ni una wallet ni una cuenta de token`,
      );
    }

    if (!(await connection.getAccountInfo(asociada))) {
      // Puede repetirse la misma wallet en dos destinos: se crea una sola vez.
      if (!porCrear.some((p) => p.cuenta.equals(asociada))) {
        porCrear.push({ cuenta: asociada, dueño: key });
      }
    }
    cuentas.push(asociada);
  }

  if (porCrear.length > 0) {
    const tx = new Transaction();
    for (const { cuenta, dueño } of porCrear) {
      tx.add(
        createAssociatedTokenAccountInstruction(
          pagadorDeRenta.publicKey,
          cuenta,
          dueño,
          mint,
        ),
      );
    }
    await sendAndConfirmTransaction(connection, tx, [pagadorDeRenta]);
  }

  return { cuentas, creadas: porCrear.map((p) => p.cuenta) };
}
