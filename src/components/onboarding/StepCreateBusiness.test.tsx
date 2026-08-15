import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { StepCreateBusiness } from "./StepCreateBusiness"
import { useMerchantStore } from "@/lib/store/useMerchantStore"

const WALLET_ADDRESS = "2f9EpTUNzFo67EJcYqQGaGqJURJUTLaYNaKdWTR9Wu8W"

vi.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({ user: null }),
}))

const walletMock: { current: { publicKey: { toBase58: () => string } } | null } = {
  current: { publicKey: { toBase58: () => WALLET_ADDRESS } },
}

vi.mock("@/lib/services/usePrivyWallet", () => ({
  usePrivyWallet: () => walletMock.current,
}))

async function fillAndSubmit(name = "Mi Tienda", email = "merchant@test.com") {
  const user = userEvent.setup()
  if (name) await user.type(screen.getByPlaceholderText("Mi Tienda"), name)
  if (email) await user.type(screen.getByPlaceholderText("merchant@tutienda.com"), email)
  await user.click(screen.getByRole("button", { name: /create business account/i }))
}

describe("StepCreateBusiness", () => {
  beforeEach(() => {
    walletMock.current = { publicKey: { toBase58: () => WALLET_ADDRESS } }
    useMerchantStore.setState({ isActive: false, name: "", email: "", walletAddress: "" })
  })

  it("activates the terminal instantly without touching the blockchain", async () => {
    const onNext = vi.fn()
    render(<StepCreateBusiness onNext={onNext} />)

    await fillAndSubmit()

    expect(await screen.findByText(/account created/i)).toBeInTheDocument()
    const state = useMerchantStore.getState()
    expect(state.isActive).toBe(true)
    expect(state.walletAddress).toBe(WALLET_ADDRESS)
    expect(state.name).toBe("Mi Tienda")
    await waitFor(() => expect(onNext).toHaveBeenCalledTimes(1), { timeout: 2500 })
  })

  it("rejects an invalid business name", async () => {
    const onNext = vi.fn()
    render(<StepCreateBusiness onNext={onNext} />)

    await fillAndSubmit("X", "merchant@test.com")

    expect(await screen.findByText(/at least 2 characters/i)).toBeInTheDocument()
    expect(onNext).not.toHaveBeenCalled()
    expect(useMerchantStore.getState().isActive).toBe(false)
  })

  it("rejects an invalid email", async () => {
    const onNext = vi.fn()
    render(<StepCreateBusiness onNext={onNext} />)

    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText("Mi Tienda"), "Mi Tienda")
    await user.type(screen.getByPlaceholderText("merchant@tutienda.com"), "not-an-email")
    // Native type="email" validation would block the submit before zod runs;
    // dispatch the submit event directly to exercise the zod layer.
    fireEvent.submit(screen.getByRole("button", { name: /create business account/i }).closest("form")!)

    expect(await screen.findByText(/valid email/i)).toBeInTheDocument()
    expect(onNext).not.toHaveBeenCalled()
  })

  it("holds the submit button until the payment account is ready", () => {
    walletMock.current = null
    render(<StepCreateBusiness onNext={vi.fn()} />)

    const button = screen.getByRole("button", { name: /preparing your account/i })
    expect(button).toBeDisabled()
  })
})
