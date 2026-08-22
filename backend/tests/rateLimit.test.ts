import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import type { NextFunction, Request, Response } from "express";
import { rateLimit } from "../src/http/rateLimit.js";

interface FakeResponse {
  statusCode: number | null;
  body: unknown;
  headers: Record<string, string>;
}

function run(
  middleware: ReturnType<typeof rateLimit>,
  ip: string,
): { passed: boolean; res: FakeResponse } {
  const res: FakeResponse = { statusCode: null, body: null, headers: {} };
  let passed = false;

  const fakeRes = {
    setHeader: (name: string, value: string) => {
      res.headers[name] = value;
    },
    status: (code: number) => {
      res.statusCode = code;
      return fakeRes;
    },
    json: (payload: unknown) => {
      res.body = payload;
      return fakeRes;
    },
  };

  middleware(
    { ip, socket: { remoteAddress: ip } } as unknown as Request,
    fakeRes as unknown as Response,
    (() => {
      passed = true;
    }) as NextFunction,
  );

  return { passed, res };
}

describe("rate limiting por IP", () => {
  it("deja pasar hasta el máximo y luego responde 429 con Retry-After", () => {
    const middleware = rateLimit({ windowMs: 60_000, max: 3 });

    for (let i = 0; i < 3; i++) {
      assert.equal(run(middleware, "1.2.3.4").passed, true, `la petición ${i + 1} debía pasar`);
    }

    const blocked = run(middleware, "1.2.3.4");
    assert.equal(blocked.passed, false);
    assert.equal(blocked.res.statusCode, 429);
    assert.ok(blocked.res.headers["Retry-After"], "falta la cabecera Retry-After");
  });

  it("cuenta cada IP por separado", () => {
    const middleware = rateLimit({ windowMs: 60_000, max: 1 });

    assert.equal(run(middleware, "10.0.0.1").passed, true);
    assert.equal(run(middleware, "10.0.0.1").passed, false);
    assert.equal(run(middleware, "10.0.0.2").passed, true);
  });

  it("reabre la ventana una vez vencida", async () => {
    const middleware = rateLimit({ windowMs: 40, max: 1 });

    assert.equal(run(middleware, "172.16.0.1").passed, true);
    assert.equal(run(middleware, "172.16.0.1").passed, false);

    await new Promise((resolve) => setTimeout(resolve, 60));
    assert.equal(run(middleware, "172.16.0.1").passed, true);
  });
});
