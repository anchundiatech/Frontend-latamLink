"use client"

import { useLanguage } from "@/lib/i18n/LanguageProvider"
import { locales, localeNames } from "@/lib/i18n/config"
import { motion, AnimatePresence } from "framer-motion"
import { Globe } from "lucide-react"
import { useState, useRef, useEffect } from "react"

export function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const current = localeNames[locale]

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-on-surface transition-colors px-2 py-1.5 rounded-default hover:bg-white/5"
      >
        <Globe className="w-3.5 h-3.5" />
        <span className="font-heading">{current}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1 glass-strong rounded-lg py-1 min-w-32.5 z-50"
          >
            {locales.map((l) => (
              <button
                key={l}
                onClick={() => {
                  setLocale(l)
                  setOpen(false)
                }}
                className={`w-full text-left px-3 py-2 text-xs font-heading transition-colors hover:bg-white/5 ${
                  locale === l ? "text-electric-purple" : "text-on-surface-variant"
                }`}
              >
                {localeNames[l]}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
