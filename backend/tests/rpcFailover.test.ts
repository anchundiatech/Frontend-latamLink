import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import type { Connection } from "@solana/web3.js";
import { TimeoutError, pollConfirmation } from "../src/relayer/service.js";

function fakeRpc(behavior: (signature: string) => { err?: unknown; confirmationStatus?: string } | null | "throw"): Connection {
  return {
    getSignatureStatuses: async (signatures: string[]) => {
      const result = behavior(signatures[0]);
      if (result === "throw") throw new Error("RPC caído");
      return { value: [result ? { err: result.err ?? null, confirmationStatus: result.confirmationStatus, slot: 42 } : null] };
    },
  } as unknown as Connection;
}

describe("pollConfirmation — failover de lectura entre RPCs", () => {
  it("usa el resultado del primer RPC si responde bien", async () => {
    const good = fakeRpc(() => ({ confirmationStatus: "confirmed" }));
    const slot = await pollConfirmation([good], "sig", 5_000);
    assert.equal(slot, 42);
  });

  it("sigue con el siguiente RPC si el primero está caído", async () => {
    const down = fakeRpc(() => "throw");
    const up = fakeRpc(() => ({ confirmationStatus: "confirmed" }));

    const slot = await pollConfirmation([down, up], "sig", 5_000);

    assert.equal(slot, 42);
  });

  it("un RPC caído no se confunde con una transacción fallida on-chain", async () => {
    let calls = 0;
    const down = fakeRpc(() => {
      calls++;
      return "throw";
    });

    await assert.rejects(pollConfirmation([down], "sig", 700), TimeoutError);
    // Se siguió reintentando contra el mismo (único) RPC en vez de abortar
    // apenas tiró la primera excepción.
    assert.ok(calls > 1);
  });

  it("una transacción realmente fallida on-chain sí corta el sondeo", async () => {
    const failed = fakeRpc(() => ({ err: { InstructionError: [0, "Custom"] } }));

    await assert.rejects(pollConfirmation([failed], "sig", 5_000), (err: Error) => {
      assert.match(err.message, /falló on-chain/);
      return true;
    });
  });
});
