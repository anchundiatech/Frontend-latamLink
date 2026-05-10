import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface Destination {
  id: string
  address: string
  label: string
  percentage: number
}

export interface MerchantState {
  name: string
  email: string
  terminalId: string
  paymentToken: "usdc" | "sol"
  merchantId: number
  feeBps: number
  posFeeBps: number
  destinations: Destination[]
  minPaymentAmount: number
  isActive: boolean
  totalPaymentsReceived: number
  totalVolume: number
  walletAddress: string
  merchantPda: string | null
  vaultPda: string | null
  gasVaultPda: string | null

  setMerchant: (merchant: Partial<MerchantState>) => void
  addDestination: (dest: Destination) => void
  removeDestination: (id: string) => void
  updateDestination: (id: string, updates: Partial<Destination>) => void
  setWalletAddress: (address: string) => void
  setMerchantPda: (pda: string) => void
  setVaultPda: (pda: string) => void
  setGasVaultPda: (pda: string) => void
  incrementPayments: (amount: number) => void
  reset: () => void
}

const initialState = {
  name: "Mi Tienda",
  email: "",
  terminalId: "POS-001",
  paymentToken: "usdc" as const,
  merchantId: Math.floor(Date.now() / 1000),
  feeBps: 50,
  posFeeBps: 30,
  destinations: [
    { id: "1", address: "", label: "Operations", percentage: 50 },
    { id: "2", address: "", label: "Savings", percentage: 30 },
    { id: "3", address: "", label: "Suppliers", percentage: 20 },
  ],
  minPaymentAmount: 1,
  isActive: true,
  totalPaymentsReceived: 0,
  totalVolume: 0,
  walletAddress: "",
  merchantPda: null,
  vaultPda: null,
  gasVaultPda: null,
}

export const useMerchantStore = create<MerchantState>()(
  persist(
    (set) => ({
      ...initialState,
      setMerchant: (merchant) => set((state) => ({ ...state, ...merchant })),
      addDestination: (dest) =>
        set((state) => ({ destinations: [...state.destinations, dest] })),
      removeDestination: (id) =>
        set((state) => ({
          destinations: state.destinations.filter((d) => d.id !== id),
        })),
      updateDestination: (id, updates) =>
        set((state) => ({
          destinations: state.destinations.map((d) =>
            d.id === id ? { ...d, ...updates } : d
          ),
        })),
      setWalletAddress: (address) => set({ walletAddress: address }),
      setMerchantPda: (pda) => set({ merchantPda: pda }),
      setVaultPda: (pda) => set({ vaultPda: pda }),
      setGasVaultPda: (pda) => set({ gasVaultPda: pda }),
      incrementPayments: (amount) =>
        set((state) => ({
          totalPaymentsReceived: state.totalPaymentsReceived + 1,
          totalVolume: state.totalVolume + amount,
        })),
      reset: () => set(initialState),
    }),
    { name: "latamlink-merchant" }
  )
)
