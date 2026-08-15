const STORAGE_KEY = "latamlink-theme"
const OLD_STORAGE_KEY = "theme"

export type Theme = "dark" | "light"

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "dark"
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null

  let stored = localStorage.getItem(STORAGE_KEY)
  if (stored === "dark" || stored === "light") return stored

  stored = localStorage.getItem(OLD_STORAGE_KEY)
  if (stored === "dark" || stored === "light") {
    localStorage.setItem(STORAGE_KEY, stored)
    localStorage.removeItem(OLD_STORAGE_KEY)
    return stored
  }

  return null
}

export function getTheme(): Theme {
  return getStoredTheme() ?? getSystemTheme()
}

export function setTheme(theme: Theme) {
  localStorage.setItem(STORAGE_KEY, theme)
  if (theme === "dark") {
    document.documentElement.classList.add("dark")
  } else {
    document.documentElement.classList.remove("dark")
  }
}

export function toggleTheme(): Theme {
  const isDark = document.documentElement.classList.contains("dark")
  const next: Theme = isDark ? "light" : "dark"
  setTheme(next)
  return next
}

export function applyTheme(theme: Theme) {
  if (theme === "dark") {
    document.documentElement.classList.add("dark")
  } else {
    document.documentElement.classList.remove("dark")
  }
}
