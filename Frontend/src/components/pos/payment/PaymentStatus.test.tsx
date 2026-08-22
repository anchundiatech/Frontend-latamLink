import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PaymentStatus } from "./PaymentStatus"

describe("PaymentStatus", () => {
  it("renders nothing for non-failed statuses", () => {
    const { rerender } = render(<PaymentStatus status="idle" />)
    expect(screen.queryByText(/payment failed/i)).not.toBeInTheDocument()

    rerender(<PaymentStatus status="pending" />)
    expect(screen.queryByText(/payment failed/i)).not.toBeInTheDocument()

    rerender(<PaymentStatus status="confirmed" />)
    expect(screen.queryByText(/payment failed/i)).not.toBeInTheDocument()

    rerender(<PaymentStatus status="expired" />)
    expect(screen.queryByText(/payment failed/i)).not.toBeInTheDocument()
  })

  it("shows the failure overlay only when the payment failed", () => {
    render(<PaymentStatus status="failed" />)
    expect(screen.getByText(/payment failed/i)).toBeInTheDocument()
  })

  it("calls onRetry when Try Again is clicked", async () => {
    const onRetry = vi.fn()
    const user = userEvent.setup()
    render(<PaymentStatus status="failed" onRetry={onRetry} />)

    await user.click(screen.getByRole("button", { name: /try again/i }))

    expect(onRetry).toHaveBeenCalled()
  })
})
