import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { withIdempotency } from "../src/relayer/idempotency.js";

describe("withIdempotency — evita doble cobro por reintento o doble tap", () => {
  it("ejecuta build solo una vez para la misma clave dentro de la ventana", async () => {
    let calls = 0;
    const key = `test-${Date.now()}-1`;
    const build = async () => {
      calls++;
      return { signature: "abc" };
    };

    const first = await withIdempotency(key, build);
    const second = await withIdempotency(key, build);

    assert.equal(calls, 1);
    assert.deepEqual(first, second);
  });

  it("colapsa llamadas concurrentes (doble tap) en una sola ejecución", async () => {
    let calls = 0;
    const key = `test-${Date.now()}-2`;
    const build = async () => {
      calls++;
      await new Promise((r) => setTimeout(r, 10));
      return { signature: "concurrent" };
    };

    const [a, b] = await Promise.all([
      withIdempotency(key, build),
      withIdempotency(key, build),
    ]);

    assert.equal(calls, 1);
    assert.deepEqual(a, b);
  });

  it("no cachea un fallo: un reintento después de un error vuelve a intentar", async () => {
    let calls = 0;
    const key = `test-${Date.now()}-3`;
    const build = async () => {
      calls++;
      if (calls === 1) throw new Error("RPC caído");
      return { signature: "ok-on-retry" };
    };

    await assert.rejects(() => withIdempotency(key, build));
    const result = await withIdempotency(key, build);

    assert.equal(calls, 2);
    assert.deepEqual(result, { signature: "ok-on-retry" });
  });

  it("claves distintas no se pisan entre sí", async () => {
    const buildA = async () => "resultado-a";
    const buildB = async () => "resultado-b";

    const [a, b] = await Promise.all([
      withIdempotency(`test-${Date.now()}-a`, buildA),
      withIdempotency(`test-${Date.now()}-b`, buildB),
    ]);

    assert.equal(a, "resultado-a");
    assert.equal(b, "resultado-b");
  });
});
