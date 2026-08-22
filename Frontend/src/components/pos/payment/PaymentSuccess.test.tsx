import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, act, fireEvent } from "@testing-library/react"
import { PaymentSuccess } from "./PaymentSuccess"

describe("PaymentSuccess", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("shows the success message after the entrance delay", async () => {
    render(<PaymentSuccess onDone={vi.fn()} />)
    expect(screen.queryByText(/payment successful/i)).not.toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(300)
    })

    expect(screen.getByText(/payment successful/i)).toBeInTheDocument()
  })

  it("calls onDone when the merchant taps New Sale", async () => {
    const onDone = vi.fn()
    render(<PaymentSuccess onDone={onDone} />)

    await act(async () => {
      vi.advanceTimersByTime(300)
    })
    fireEvent.click(screen.getByRole("button", { name: /new sale/i }))

    expect(onDone).toHaveBeenCalled()
  })

  it("auto-dismisses after 5s even if the merchant doesn't tap anything", async () => {
    const onDone = vi.fn()
    render(<PaymentSuccess onDone={onDone} />)

    await act(async () => {
      vi.advanceTimersByTime(5000)
    })

    expect(onDone).toHaveBeenCalled()
  })
})
