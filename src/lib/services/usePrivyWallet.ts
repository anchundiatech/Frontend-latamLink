"use client"

import { useWallets } from "@privy-io/react-auth/solana"
import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js"
import { config } from "@/lib/config"

// In Privy v3, `useWallets` from the MAIN package returns Ethereum wallets
// only. Solana wallets (including the invisible embedded one created on
// login) come from the `@privy-io/react-auth/solana` subpath, which follows
// the Solana Wallet Standard: transactions are signed as raw bytes.

export interface PrivyWallet {
  publicKey: PublicKey
  signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T>
  signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]>
}

type StandardSolanaWalletLike = {
  address: string
  standardWallet?: { name?: string }
  signTransaction(input: {
    transaction: Uint8Array
    chain?: string
  }): Promise<{ signedTransaction: Uint8Array }>
}

const chain = `solana:${config.cluster === "mainnet" ? "mainnet" : "devnet"}`

function serializeTx(tx: Transaction | VersionedTransaction): Uint8Array {
  return tx instanceof VersionedTransaction
    ? tx.serialize()
    : new Uint8Array(tx.serialize({ requireAllSignatures: false, verifySignatures: false }))
}

function deserializeTx<T extends Transaction | VersionedTransaction>(
  bytes: Uint8Array,
  original: T
): T {
  return (
    original instanceof VersionedTransaction
      ? VersionedTransaction.deserialize(bytes)
      : Transaction.from(bytes)
  ) as T
}

function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address)
    return true
  } catch {
    return false
  }
}

export function usePrivyWallet(): PrivyWallet | null {
  const { wallets } = useWallets()

  const solanaWallets = wallets as unknown as StandardSolanaWalletLike[]
  const raw =
    solanaWallets.find(
      (w) =>
        w.standardWallet?.name?.toLowerCase().includes("privy") &&
        isValidSolanaAddress(w.address)
    ) ?? solanaWallets.find((w) => isValidSolanaAddress(w.address))
  if (!raw) return null

  const signOne = async <T extends Transaction | VersionedTransaction>(tx: T): Promise<T> => {
    const { signedTransaction } = await raw.signTransaction({
      transaction: serializeTx(tx),
      chain,
    })
    return deserializeTx(signedTransaction, tx)
  }

  return {
    get publicKey() {
      return new PublicKey(raw.address)
    },
    signTransaction: signOne,
    signAllTransactions: async <T extends Transaction | VersionedTransaction>(
      txs: T[]
    ): Promise<T[]> => {
      const signed: T[] = []
      for (const tx of txs) {
        signed.push(await signOne(tx))
      }
      return signed
    },
  }
}
