import { describe, it, expect } from "vitest"
import { elegirCuentaDePago } from "./useCuentaDePago"

const EMBEBIDA = "EmbebidaDePrivy1111111111111111111111111111"
const EXTERNA = "ExternaDePhantom111111111111111111111111111"

describe("elegirCuentaDePago", () => {
  it("toma la wallet que Privy crea al entrar con Google", () => {
    const cuentas = [
      { type: "google_oauth" },
      { type: "wallet", chainType: "solana", address: EMBEBIDA, walletClientType: "privy" },
    ]

    expect(elegirCuentaDePago(cuentas)).toBe(EMBEBIDA)
  })

  it("prefiere la embebida aunque haya una wallet externa vinculada antes", () => {
    const cuentas = [
      { type: "wallet", chainType: "solana", address: EXTERNA, walletClientType: "phantom" },
      { type: "wallet", chainType: "solana", address: EMBEBIDA, walletClientType: "privy" },
    ]

    // Si tomara la primera, el comerciante cambiaría de identidad y se quedaría
    // sin su comercio.
    expect(elegirCuentaDePago(cuentas)).toBe(EMBEBIDA)
  })

  it("ignora las wallets que no son de Solana", () => {
    const cuentas = [
      { type: "wallet", chainType: "ethereum", address: "0xabc", walletClientType: "privy" },
    ]

    expect(elegirCuentaDePago(cuentas)).toBeNull()
  })

  it("devuelve null mientras la cuenta todavía se está creando", () => {
    expect(elegirCuentaDePago([{ type: "google_oauth" }])).toBeNull()
    expect(elegirCuentaDePago([])).toBeNull()
  })
})
