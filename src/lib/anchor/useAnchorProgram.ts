"use client"

import { AnchorProvider, BN } from "@coral-xyz/anchor"
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js"
import { useCallback, useMemo } from "react"
import { getProgram, fetchMerchantAccount, deriveMerchantPDA, deriveVaultPDA, deriveGasVaultPDA } from "@/lib/anchor/client"
import { useMerchantStore } from "@/lib/store/useMerchantStore"
import { usePrivyWallet } from "@/lib/services/usePrivyWallet"
import { sponsorMerchantSetup } from "@/lib/actions/sponsorMerchantSetup"
import { config } from "@/lib/config"

const connection = new Connection(config.rpcEndpoint, "confirmed")

// A brand-new embedded wallet has 0 SOL, so it can't pay the network fee for
// its own setup transaction. The merchant must never fund it themselves —
// the platform treasury sponsors the setup cost (server action), with the
// devnet faucet as a fallback for unconfigured dev environments.
export class InsufficientFundsError extends Error {
  constructor(public walletAddress: string) {
    super("Wallet has no funds to cover the network fee")
    this.name = "InsufficientFundsError"
  }
}

async function ensureDevnetFunds(owner: PublicKey): Promise<void> {
  if (config.cluster !== "devnet") return

  const balance = await connection.getBalance(owner)
  if (balance >= 10_000_000) return // 0.01 SOL comfortably covers fees + rent

  const sponsored = await sponsorMerchantSetup(owner.toBase58())
  if (sponsored.funded) return

  try {
    const signature = await connection.requestAirdrop(owner, 1_000_000_000)
    const latest = await connection.getLatestBlockhash()
    await connection.confirmTransaction({ signature, ...latest }, "confirmed")
  } catch {
    // Both the treasury and the rate-limited faucet failed; surface the
    // address so the developer can fund it manually.
    throw new InsufficientFundsError(owner.toBase58())
  }
}

export function useProgram() {
  const wallet = usePrivyWallet()

  const provider = useMemo(() => {
    if (!wallet) return null
    return new AnchorProvider(connection, wallet, { commitment: "confirmed" })
  }, [wallet])

  const program = useMemo(() => {
    if (!provider) return null
    return getProgram(provider)
  }, [provider])

  return { program, provider, wallet }
}

export function useInitializeMerchant() {
  const { program, provider, wallet } = useProgram()
  const store = useMerchantStore()

  const initialize = useCallback(async () => {
    if (!program || !provider || !wallet) {
      throw new Error("Wallet not available")
    }

    await ensureDevnetFunds(wallet.publicKey)

    const merchantIdBN = new BN(store.merchantId ?? 0)
    const paymentTokenMint = new PublicKey(
      store.paymentToken === "usdc" ? config.usdcMint : config.solMint
    )

    const merchantPda = deriveMerchantPDA(wallet.publicKey, merchantIdBN)
    const vaultPda = deriveVaultPDA(merchantPda)
    const gasVaultPda = deriveGasVaultPDA(merchantPda)

    const destPubkeys = store.destinations.map((d) =>
      d.address ? new PublicKey(d.address) : wallet.publicKey
    )

    const percentages: number[] = []
    for (let i = 0; i < 10; i++) {
      percentages.push(i < store.destinations.length ? store.destinations[i].percentage : 0)
    }

    while (destPubkeys.length < 10) {
      destPubkeys.push(wallet.publicKey)
    }

    const tx = await program.methods
      .initializeMerchant(
        merchantIdBN,
        store.feeBps ?? 0,
        store.posFeeBps ?? 0,
        new BN(store.minPaymentAmount ?? 0),
        store.destinations.length ?? 0,
        percentages,
        store.terminalId ?? "",
      )
      .accounts({
        owner: wallet.publicKey,
        merchant: merchantPda,
        paymentTokenMint,
        vault: vaultPda,
        gasVault: gasVaultPda,
        destination0: destPubkeys[0],
        destination1: destPubkeys[1],
        destination2: destPubkeys[2],
        destination3: destPubkeys[3],
        destination4: destPubkeys[4],
        destination5: destPubkeys[5],
        destination6: destPubkeys[6],
        destination7: destPubkeys[7],
        destination8: destPubkeys[8],
        destination9: destPubkeys[9],
        tokenProgram: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
        systemProgram: SystemProgram.programId,
      })
      .rpc()

    store.setMerchantPda(merchantPda.toBase58())
    store.setVaultPda(vaultPda.toBase58())
    store.setGasVaultPda(gasVaultPda.toBase58())
    store.setWalletAddress(wallet.publicKey.toBase58())
    store.setMerchant({ isActive: true })

    return { success: true, tx, merchantPda: merchantPda.toBase58() }
  }, [program, provider, wallet, store])

  return { initialize }
}

export function useProcessPayment() {
  const { program, provider, wallet } = useProgram()
  const store = useMerchantStore()

  const processPayment = useCallback(
    async (amount: number) => {
      if (!program || !provider || !wallet || !store.merchantPda) {
        throw new Error("Wallet or merchant not available")
      }

      const merchantPda = new PublicKey(store.merchantPda)
      const paymentTokenMint = new PublicKey(
        store.paymentToken === "usdc" ? config.usdcMint : config.solMint
      )
      const vaultPda = deriveVaultPDA(merchantPda)
      const gasVaultPda = deriveGasVaultPDA(merchantPda)

      const destPubkeys = store.destinations.map((d) => new PublicKey(d.address || wallet.publicKey))
      while (destPubkeys.length < 10) destPubkeys.push(wallet.publicKey)

      const amountLamports = Math.floor(amount * 1_000_000)

      const tx = await program.methods
        .pay(new BN(amountLamports))
        .accounts({
          payer: wallet.publicKey,
          payerTokenAccount: wallet.publicKey,
          merchant: merchantPda,
          paymentTokenMint,
          posFeeDestination: destPubkeys[0],
          vault: vaultPda,
          gasVault: gasVaultPda,
          destination0: destPubkeys[0],
          destination1: destPubkeys[1],
          destination2: destPubkeys[2],
          destination3: destPubkeys[3],
          destination4: destPubkeys[4],
          destination5: destPubkeys[5],
          destination6: destPubkeys[6],
          destination7: destPubkeys[7],
          destination8: destPubkeys[8],
          destination9: destPubkeys[9],
          tokenProgram: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
          systemProgram: SystemProgram.programId,
        })
        .rpc()

      store.incrementPayments(amount)
      return { success: true, tx }
    },
    [program, provider, wallet, store]
  )

  return { processPayment }
}

export function useFetchMerchant() {
  const { program, provider } = useProgram()

  const fetchMerchant = useCallback(
    async (merchantPda: string) => {
      if (!provider) return null
      const pda = new PublicKey(merchantPda)
      return await fetchMerchantAccount(provider, pda)
    },
    [provider]
  )

  return { fetchMerchant }
}

export function useUpdateConfig() {
  const { program, provider, wallet } = useProgram()
  const store = useMerchantStore()

  const update = useCallback(async () => {
    if (!program || !provider || !wallet || !store.merchantPda) {
      throw new Error("Wallet or merchant not available")
    }

    const merchantPda = new PublicKey(store.merchantPda)
    const percentages: number[] = []
    for (let i = 0; i < 10; i++) {
      percentages.push(i < store.destinations.length ? store.destinations[i].percentage : 0)
    }

    const destPubkeys = store.destinations.map((d) => new PublicKey(d.address || wallet.publicKey))
    while (destPubkeys.length < 10) destPubkeys.push(wallet.publicKey)

    const tx = await program.methods
      .updateConfig(
        store.feeBps ?? 0,
        store.posFeeBps ?? 0,
        new BN(store.minPaymentAmount ?? 0),
        store.destinations.length ?? 0,
        percentages,
      )
      .accounts({
        owner: wallet.publicKey,
        merchant: merchantPda,
        destination0: destPubkeys[0],
        destination1: destPubkeys[1],
        destination2: destPubkeys[2],
        destination3: destPubkeys[3],
        destination4: destPubkeys[4],
        destination5: destPubkeys[5],
        destination6: destPubkeys[6],
        destination7: destPubkeys[7],
        destination8: destPubkeys[8],
        destination9: destPubkeys[9],
      })
      .rpc()

    return { success: true, tx }
  }, [program, provider, wallet, store])

  return { update }
}
