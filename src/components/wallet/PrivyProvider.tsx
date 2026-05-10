"use client"

import { PrivyProvider as Privy } from "@privy-io/react-auth"
import { config } from "@/lib/config"

export function PrivyProvider({ children }: { children: React.ReactNode }) {
  return (
    <Privy
      appId={config.privyAppId}
      config={{
        loginMethods: ["email"],
        appearance: { theme: "dark" },
        embeddedWallets: {
          solana: {
            createOnLogin: "all-users",
          },
        },
      }}
    >
      {children}
    </Privy>
  )
}
