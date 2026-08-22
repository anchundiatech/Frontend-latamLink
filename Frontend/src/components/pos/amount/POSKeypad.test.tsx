import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { POSKeypad } from "./POSKeypad"

function setup(amount: string) {
  const onAmountChange = vi.fn()
  render(<POSKeypad amount={amount} onAmountChange={onAmountChange} />)
  return { onAmountChange, user: userEvent.setup() }
}

describe("POSKeypad", () => {
  it("appends a digit to the current amount", async () => {
    const { onAmountChange, user } = setup("1")
    await user.click(screen.getByRole("button", { name: "2" }))
    expect(onAmountChange).toHaveBeenCalledWith("12")
  })

  it("replaces a lone leading zero instead of appending", async () => {
    const { onAmountChange, user } = setup("0")
    await user.click(screen.getByRole("button", { name: "5" }))
    expect(onAmountChange).toHaveBeenCalledWith("5")
  })

  it("adds a decimal point only once", async () => {
    const { onAmountChange, user } = setup("1.5")
    await user.click(screen.getByRole("button", { name: "." }))
    expect(onAmountChange).not.toHaveBeenCalled()
  })

  it("blocks a third decimal digit — money never needs more than 2", async () => {
    const { onAmountChange, user } = setup("1.50")
    await user.click(screen.getByRole("button", { name: "9" }))
    expect(onAmountChange).not.toHaveBeenCalled()
  })

  it("allows a second decimal digit", async () => {
    const { onAmountChange, user } = setup("1.5")
    await user.click(screen.getByRole("button", { name: "0" }))
    expect(onAmountChange).toHaveBeenCalledWith("1.50")
  })

  it("deletes the last character on backspace", async () => {
    const { onAmountChange, user } = setup("12.5")
    await user.click(screen.getByRole("button", { name: "Delete last digit" }))
    expect(onAmountChange).toHaveBeenCalledWith("12.")
  })
})
