"use client"

import { useWallets } from "@privy-io/react-auth"
import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js"

type PrivyWalletLike = {
  address: string
  walletClientType?: string
  connectorType?: string
  imported: boolean
  signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T>
  signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]>
}

export interface PrivyWallet {
  publicKey: PublicKey
  signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T>
  signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]>
}

export function usePrivyWallet(): PrivyWallet | null {
  const { wallets } = useWallets()

  const raw =
    wallets.find(
      (w) => w.walletClientType === "privy" && w.connectorType === "embedded" && !w.imported
    ) ?? wallets[0]
  if (!raw) return null

  const wallet = raw as unknown as PrivyWalletLike

  return {
    get publicKey() {
      return new PublicKey(wallet.address)
    },
    signTransaction: async <T extends Transaction | VersionedTransaction>(tx: T): Promise<T> =>
      wallet.signTransaction(tx),
    signAllTransactions: async <T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> =>
      wallet.signAllTransactions(txs),
  }
}
