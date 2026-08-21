"use client"

import { useMerchantStore } from "@/lib/store/useMerchantStore"

export function TokenSettings() {
  const { paymentToken, setMerchant } = useMerchantStore()

  return (
    <div className="glass rounded-lg p-4">
      <h3 className="text-sm font-heading text-on-surface mb-1">
        Payment Currency
      </h3>
      <p className="text-xs text-on-surface-variant mb-4">
        Select the default currency for payments
      </p>
      <div className="flex items-center gap-3">
        {["usdc", "sol"].map((token) => (
          <button
            key={token}
            onClick={() => setMerchant({ paymentToken: token as "usdc" | "sol" })}
            className={`px-4 py-2.5 rounded-default text-xs font-heading font-medium transition-all duration-200 ${
              paymentToken === token
                ? "bg-electric-purple text-white"
                : "bg-surface-container text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {token.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  )
}
