import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { PaymentQRCode } from "./PaymentQRCode"

const BASE_PROPS = {
  amount: "10.00",
  token: "usdc",
  cryptoAmount: null,
  recipientAddress: "2f9EpTUNzFo67EJcYqQGaGqJURJUTLaYNaKdWTR9Wu8W",
}

describe("PaymentQRCode", () => {
  let writeText: ReturnType<typeof vi.fn>

  beforeEach(() => {
    writeText = vi.fn()
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    })
  })

  it("shows a placeholder while the QR URL hasn't been generated yet", () => {
    render(<PaymentQRCode {...BASE_PROPS} solanaPayUrl={null} />)
    expect(screen.getByText(/generating qr/i)).toBeInTheDocument()
  })

  it("renders the QR code once the Solana Pay URL is ready", () => {
    const { container } = render(
      <PaymentQRCode {...BASE_PROPS} solanaPayUrl="solana:merchant?amount=10" />
    )
    expect(container.querySelector("svg")).not.toBeNull()
    expect(screen.queryByText(/generating qr/i)).not.toBeInTheDocument()
  })

  it("shows the formatted USD amount", () => {
    render(<PaymentQRCode {...BASE_PROPS} solanaPayUrl="solana:merchant?amount=10" />)
    expect(screen.getByText("$10.00")).toBeInTheDocument()
  })

  it("copies the payment link when the copy button is clicked", () => {
    render(<PaymentQRCode {...BASE_PROPS} solanaPayUrl="solana:merchant?amount=10" />)

    fireEvent.click(screen.getByRole("button", { name: /copy payment link/i }))

    expect(writeText).toHaveBeenCalledWith("solana:merchant?amount=10")
  })
})
