import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { AmountDisplay } from "./AmountDisplay"

describe("AmountDisplay", () => {
  it("shows 0 as a placeholder when the amount is empty", () => {
    render(<AmountDisplay amount="" />)
    expect(screen.getByText("0")).toBeInTheDocument()
  })

  it("shows the typed amount", () => {
    render(<AmountDisplay amount="12.5" />)
    expect(screen.getByText("12.5")).toBeInTheDocument()
  })

  it("warns when a positive amount is below the merchant's minimum", () => {
    render(<AmountDisplay amount="0.5" minAmount={1} />)
    expect(screen.getByText(/minimum payment amount: \$1\.00/i)).toBeInTheDocument()
  })

  it("does not warn when there is no amount entered yet", () => {
    render(<AmountDisplay amount="" minAmount={1} />)
    expect(screen.queryByText(/minimum payment amount/i)).not.toBeInTheDocument()
  })

  it("does not warn once the amount meets the minimum", () => {
    render(<AmountDisplay amount="1" minAmount={1} />)
    expect(screen.queryByText(/minimum payment amount/i)).not.toBeInTheDocument()
  })
})
