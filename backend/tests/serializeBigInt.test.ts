import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { serializeBigInt } from "../src/lib/prisma.js";

describe("serializeBigInt — evita perder precisión de montos on-chain en JSON", () => {
  it("convierte un BigInt de nivel superior a string", () => {
    assert.equal(serializeBigInt(12_500_000n), "12500000");
  });

  it("convierte BigInt anidados dentro de objetos y arreglos", () => {
    const input = {
      amountGross: 10_000_000n,
      posFee: 100_000n,
      splits: [{ amount: 5_000_000n }, { amount: 4_900_000n }],
    };

    assert.deepEqual(serializeBigInt(input), {
      amountGross: "10000000",
      posFee: "100000",
      splits: [{ amount: "5000000" }, { amount: "4900000" }],
    });
  });

  it("deja pasar sin tocar valores que no son BigInt", () => {
    const input = { name: "comercio", isActive: true, count: 3, note: null };
    assert.deepEqual(serializeBigInt(input), input);
  });
});
