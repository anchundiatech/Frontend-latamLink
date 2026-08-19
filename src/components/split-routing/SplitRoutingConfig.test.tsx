import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { Keypair } from "@solana/web3.js"
import { SplitRoutingConfig } from "./SplitRoutingConfig"
import { useMerchantStore } from "@/lib/store/useMerchantStore"

// Alta y edición on-chain las hace el backend firmando con la wallet de la
// plataforma (owner del comercio); el navegador nunca firma.
const updateMock = vi.fn().mockResolvedValue({ signature: "FirmaDePrueba" })
const createMock = vi.fn().mockResolvedValue({ merchant: "MerchantPdaDePrueba" })

vi.mock("@/lib/services/useUpdateMerchantConfig", () => ({
  useUpdateMerchantConfig: () => ({ update: updateMock }),
}))

vi.mock("@/lib/services/useCreateMerchant", () => ({
  useCreateMerchant: () => ({ create: createMock }),
}))

// Las billeteras vinculadas son opcionales; en los tests no hay ninguna.
vi.mock("@/lib/services/useWalletsVinculadas", () => ({
  useWalletsVinculadas: () => ({ wallets: [], vincular: vi.fn(), listo: true }),
}))

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const VALID_ADDRESS_1 = Keypair.generate().publicKey.toBase58()
const VALID_ADDRESS_2 = Keypair.generate().publicKey.toBase58()

async function addRecipient(label: string, address: string) {
  const user = userEvent.setup()
  await user.type(screen.getByPlaceholderText("Label"), label)
  await user.type(screen.getByPlaceholderText("Dirección de billetera"), address)
  await user.click(screen.getByRole("button", { name: /add/i }))
}

describe("SplitRoutingConfig", () => {
  beforeEach(() => {
    updateMock.mockClear()
    createMock.mockClear()
    vi.mocked(toast.success).mockClear()
    vi.mocked(toast.error).mockClear()
    useMerchantStore.setState({
      merchantPda: null,
      destinations: [
        { id: "1", address: "", label: "Operations", percentage: 50 },
        { id: "2", address: "", label: "Savings", percentage: 30 },
        { id: "3", address: "", label: "Suppliers", percentage: 20 },
      ],
    })
  })

  it("rejects an invalid account address instead of adding it", async () => {
    render(<SplitRoutingConfig />)
    await addRecipient("Payroll", "not-a-real-address")

    expect(toast.error).toHaveBeenCalledWith("That doesn't look like a valid account address")
    expect(useMerchantStore.getState().destinations).toHaveLength(3)
  })

  it("rejects a duplicate account address", async () => {
    useMerchantStore.setState({
      destinations: [
        { id: "1", address: VALID_ADDRESS_1, label: "Operations", percentage: 100 },
      ],
    })
    render(<SplitRoutingConfig />)
    await addRecipient("Payroll", VALID_ADDRESS_1)

    expect(toast.error).toHaveBeenCalledWith("That account is already added")
    expect(useMerchantStore.getState().destinations).toHaveLength(1)
  })

  it("accepts a valid, non-duplicate address", async () => {
    useMerchantStore.setState({ destinations: [] })
    render(<SplitRoutingConfig />)
    await addRecipient("Payroll", VALID_ADDRESS_2)

    expect(toast.success).toHaveBeenCalledWith("Recipient added")
    expect(useMerchantStore.getState().destinations).toHaveLength(1)
  })

  it("blocks saving when a funded destination has no address configured", async () => {
    useMerchantStore.setState({
      destinations: [
        { id: "1", address: "", label: "Operations", percentage: 100 },
      ],
    })
    render(<SplitRoutingConfig />)

    const user = userEvent.setup()
    await user.click(screen.getByRole("button", { name: /save configuration/i }))

    expect(toast.error).toHaveBeenCalledWith(
      'Add an account address for "Operations" before saving'
    )
    expect(updateMock).not.toHaveBeenCalled()
  })

  it("creates the on-chain account on the first save (no merchantPda yet)", async () => {
    useMerchantStore.setState({
      merchantPda: null,
      destinations: [
        { id: "1", address: VALID_ADDRESS_1, label: "Operations", percentage: 100 },
      ],
    })
    render(<SplitRoutingConfig />)

    const user = userEvent.setup()
    await user.click(screen.getByRole("button", { name: /save configuration/i }))

    expect(createMock).toHaveBeenCalledTimes(1)
    expect(updateMock).not.toHaveBeenCalled()
  })

  it("updates the existing on-chain account on later saves", async () => {
    useMerchantStore.setState({
      merchantPda: VALID_ADDRESS_2,
      destinations: [
        { id: "1", address: VALID_ADDRESS_1, label: "Operations", percentage: 100 },
      ],
    })
    render(<SplitRoutingConfig />)

    const user = userEvent.setup()
    await user.click(screen.getByRole("button", { name: /save configuration/i }))

    expect(updateMock).toHaveBeenCalledTimes(1)
    expect(createMock).not.toHaveBeenCalled()
  })

  it("rebalances the other destinations so the total always stays at 100%", async () => {
    useMerchantStore.setState({
      destinations: [
        { id: "1", address: VALID_ADDRESS_1, label: "Operations", percentage: 50 },
        { id: "2", address: VALID_ADDRESS_2, label: "Savings", percentage: 30 },
        { id: "3", address: "", label: "Suppliers", percentage: 20 },
      ],
    })
    render(<SplitRoutingConfig />)

    const sliders = screen.getAllByRole("slider")
    sliders[0].focus()
    const user = userEvent.setup()
    // Radix slider: each arrow press moves the value by one step.
    await user.keyboard("{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}")

    const { destinations } = useMerchantStore.getState()
    const total = destinations.reduce((sum, d) => sum + d.percentage, 0)
    expect(destinations[0].percentage).toBe(55)
    expect(total).toBe(100)
  })
})
