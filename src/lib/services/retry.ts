export class RateLimitError extends Error {
  constructor(public retryAfterMs: number) {
    super(`Rate limited. Retry after ${retryAfterMs}ms`)
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number
    baseDelayMs?: number
    onRetry?: (attempt: number, delay: number) => void
  } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelayMs = 1000, onRetry } = options

  for (let attempt = 0; ; attempt++) {
    try {
      return await fn()
    } catch (err: unknown) {
      if (attempt >= maxRetries) throw err

      const errMsg = String(err)
      const is429 =
        errMsg.includes("429") ||
        errMsg.includes("Too Many Requests") ||
        errMsg.includes("rate limit") ||
        errMsg.includes("RateLimit")

      const delay = is429
        ? Math.min(1000 * Math.pow(2, attempt) + Math.random() * 500, 15000)
        : baseDelayMs

      if (is429 && onRetry) onRetry(attempt + 1, delay)

      await new Promise((r) => setTimeout(r, delay))
    }
  }
}
