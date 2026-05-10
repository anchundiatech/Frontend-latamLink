const CLUSTER = "devnet" as const

const mints = {
  mainnet: {
    usdc: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    sol: "So11111111111111111111111111111111111111112",
  },
  devnet: {
    usdc: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    sol: "So11111111111111111111111111111111111111112",
  },
}

export const config = {
  programId: "GSeGuv2K3meepgSHCehP5jGkRnjRZk96a9vsPSSJ7TjC",
  cluster: CLUSTER,
  rpcEndpoint: "https://api.devnet.solana.com",
  usdcMint: mints[CLUSTER].usdc,
  solMint: mints[CLUSTER].sol,
  appName: "LatamLink Pay",
  appDescription: "Accept Stablecoin Payments in Minutes",
  maxDestinations: 10,
  defaultFeeBps: 50,
}

export const navigation = [
  { name: "POS Terminal", href: "/portal/pos", icon: "credit-card" },
  { name: "Dashboard", href: "/portal/dashboard", icon: "layout-dashboard" },
  { name: "Split Routing", href: "/portal/split-routing", icon: "git-branch" },
  { name: "Transactions", href: "/portal/transactions", icon: "arrow-left-right" },
  { name: "Settings", href: "/portal/settings", icon: "settings" },
]
