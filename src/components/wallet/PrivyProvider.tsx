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
  // Sin app ID, Privy lanza al construirse y tumba el prerenderizado de las
  // páginas que lo usan: el build entero fallaba cuando la variable no estaba
  // definida (por ejemplo, en un despliegue de vista previa sin configurar).
  // La app se renderiza igual; lo que no habrá es sesión, y se avisa en consola.
  if (!config.privyAppId) {
    if (typeof window !== "undefined") {
      console.warn(
        "NEXT_PUBLIC_PRIVY_APP_ID no está configurado: el inicio de sesión está deshabilitado."
      )
    }
    return <>{children}</>
  }

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
