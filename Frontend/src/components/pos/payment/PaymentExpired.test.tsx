import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PaymentExpired } from "./PaymentExpired"

describe("PaymentExpired", () => {
  it("renders nothing for non-expired statuses, including failed", () => {
    const { rerender } = render(<PaymentExpired status="idle" />)
    expect(screen.queryByText(/qr code expired/i)).not.toBeInTheDocument()

    rerender(<PaymentExpired status="failed" />)
    expect(screen.queryByText(/qr code expired/i)).not.toBeInTheDocument()

    rerender(<PaymentExpired status="confirmed" />)
    expect(screen.queryByText(/qr code expired/i)).not.toBeInTheDocument()
  })

  it("shows the expiry overlay when the watcher times out", () => {
    render(<PaymentExpired status="expired" />)
    expect(screen.getByText(/qr code expired/i)).toBeInTheDocument()
  })

  it("does not use failure language — a timeout is not a confirmed failure", () => {
    render(<PaymentExpired status="expired" />)
    expect(screen.queryByText(/payment failed/i)).not.toBeInTheDocument()
  })

  it("calls onRetry when generating a new QR", async () => {
    const onRetry = vi.fn()
    const user = userEvent.setup()
    render(<PaymentExpired status="expired" onRetry={onRetry} />)

    await user.click(screen.getByRole("button", { name: /generate new qr/i }))

    expect(onRetry).toHaveBeenCalled()
  })
})
