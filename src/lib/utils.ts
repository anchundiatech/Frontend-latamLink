import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, decimals: number = 2): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount)
}

export function formatSOL(lamports: number): string {
  const sol = lamports / 1_000_000_000
  return `${sol.toFixed(4)} SOL`
}

export function formatUSDC(amount: number): string {
  return `$${amount.toFixed(2)}`
}

export function shortenAddress(address: string, chars: number = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export function bpsToPercent(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`
}

export function percentToBps(percent: number): number {
  return Math.round(percent * 100)
}
