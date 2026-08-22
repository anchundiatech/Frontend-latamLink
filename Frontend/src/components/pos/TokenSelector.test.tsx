import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { TokenSelector } from "./TokenSelector"

describe("TokenSelector", () => {
  it("renders both supported tokens", () => {
    render(<TokenSelector selected="usdc" onSelect={vi.fn()} />)
    expect(screen.getByText("USD Coin")).toBeInTheDocument()
    expect(screen.getByText("Solana")).toBeInTheDocument()
  })

  it("calls onSelect with the clicked token", async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<TokenSelector selected="usdc" onSelect={onSelect} />)

    await user.click(screen.getByText("Solana"))

    expect(onSelect).toHaveBeenCalledWith("sol")
  })
})
