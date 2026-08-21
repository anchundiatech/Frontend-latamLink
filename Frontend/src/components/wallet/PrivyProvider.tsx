"use client"

import { PrivyProvider as Privy } from "@privy-io/react-auth"
import { createSolanaRpc, createSolanaRpcSubscriptions } from "@solana/kit"
import { config } from "@/lib/config"

const solanaChain =
  config.cluster === "mainnet" ? ("solana:mainnet" as const) : ("solana:devnet" as const)

// https -> wss, http -> ws
const wsEndpoint = config.rpcEndpoint.replace(/^http/, "ws")

const solanaRpcs = {
  [solanaChain]: {
    rpc: createSolanaRpc(config.rpcEndpoint),
    rpcSubscriptions: createSolanaRpcSubscriptions(wsEndpoint),
  },
}

export function PrivyProvider({ children }: { children: React.ReactNode }) {
  return (
    <Privy
      appId={config.privyAppId}
      config={{
        loginMethods: ["email", "google"],
        appearance: { theme: "dark" },
        embeddedWallets: {
          solana: {
            createOnLogin: "all-users",
          },
        },
        solana: {
          rpcs: solanaRpcs,
        },
      }}
    >
      {children}
    </Privy>
  )
}
