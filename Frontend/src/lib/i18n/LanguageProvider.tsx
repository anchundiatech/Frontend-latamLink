"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import { type Locale, defaultLocale, locales } from "./config"
import { dictionaries } from "./dictionary"

interface LanguageContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (typeof dictionaries)[Locale]
}

const LanguageContext = createContext<LanguageContextType | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === "undefined") return defaultLocale
    const savedLocale = localStorage.getItem("locale") as Locale
    if (savedLocale && locales.includes(savedLocale)) return savedLocale
    const browserLang = navigator.language.slice(0, 2) as Locale
    if (locales.includes(browserLang)) return browserLang
    return defaultLocale
  })

  const setLocale = useCallback((newLocale: Locale) => {
    if (locales.includes(newLocale)) {
      setLocaleState(newLocale)
      localStorage.setItem("locale", newLocale)
    }
  }, [])

  const t = dictionaries[locale]

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider")
  return ctx
}

