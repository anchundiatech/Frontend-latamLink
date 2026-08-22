import { describe, it, expect, afterEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { useDeviceType } from "./useDeviceType"

function mockMatchMedia(matchingQueries: string[]) {
  window.matchMedia = ((query: string) => ({
    matches: matchingQueries.includes(query),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

function Probe() {
  const deviceType = useDeviceType()
  return <span data-testid="device-type">{deviceType}</span>
}

describe("useDeviceType", () => {
  afterEach(() => {
    // @ts-expect-error test-only cleanup of the global mock
    delete window.matchMedia
  })

  it("classifies a narrow viewport as mobile", () => {
    mockMatchMedia(["(max-width: 639px)"])
    render(<Probe />)
    expect(screen.getByTestId("device-type")).toHaveTextContent("mobile")
  })

  it("classifies a mid-width portrait viewport as tablet-portrait", () => {
    mockMatchMedia([
      "(min-width: 640px) and (max-width: 1023px)",
      "(orientation: portrait)",
    ])
    render(<Probe />)
    expect(screen.getByTestId("device-type")).toHaveTextContent("tablet-portrait")
  })

  it("classifies a mid-width landscape viewport as tablet-landscape", () => {
    mockMatchMedia(["(min-width: 640px) and (max-width: 1023px)"])
    render(<Probe />)
    expect(screen.getByTestId("device-type")).toHaveTextContent("tablet-landscape")
  })

  it("classifies a 1024-1279px viewport as laptop", () => {
    mockMatchMedia(["(min-width: 1024px) and (max-width: 1279px)"])
    render(<Probe />)
    expect(screen.getByTestId("device-type")).toHaveTextContent("laptop")
  })

  it("classifies a wide viewport as desktop by default", () => {
    mockMatchMedia([])
    render(<Probe />)
    expect(screen.getByTestId("device-type")).toHaveTextContent("desktop")
  })
})
