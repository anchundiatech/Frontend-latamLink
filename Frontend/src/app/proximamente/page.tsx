/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useLanguage } from "@/lib/i18n/LanguageProvider"
import { ArrowRight, Check, Languages, Sun, Moon } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { getTheme, toggleTheme } from "@/lib/theme"

function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    setMounted(true)
    setIsDark(getTheme() === "dark")
  }, [])

  const handleToggle = () => {
    const next = toggleTheme()
    setIsDark(next === "dark")
  }

  if (!mounted) return null
  return (
    <button onClick={handleToggle} className="p-2 rounded-lg hover:bg-surface transition-colors cursor-pointer" aria-label="Toggle theme">
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}

function LanguageToggle() {
  const { locale, setLocale } = useLanguage()
  return (
    <button
      onClick={() => setLocale(locale === "es" ? "en" : "es")}
      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-surface hover:bg-surface-bright transition-all duration-200 cursor-pointer"
    >
      <Languages size={16} />
      <span className="text-sm font-medium uppercase">{locale}</span>
    </button>
  )
}

export default function Proximamente() {
  const { t } = useLanguage()
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !email.includes("@")) {
      setStatus("error")
      setTimeout(() => setStatus("idle"), 1500)
      return
    }
    setStatus("success")
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-text-primary">

      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 px-4 md:px-8 flex items-center justify-between bg-background/80 backdrop-blur-md border-b border-border">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <Image src="/Logo.webp" alt="LatamLink Pay" width={40} height={40} className="size-10 object-contain" />
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-text-primary leading-none">
            LatamLink <span className="text-primary">Pay</span>
          </h1>
        </Link>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>

      {/* HERO */}
      <section className="relative min-h-screen flex items-center justify-center px-4 pt-16 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 overflow-hidden">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover opacity-10 dark:opacity-[0.15]"
          >
            <source src="/video/logo_animate.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-background/40" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_80%_20%,rgba(45,212,191,0.08)_0%,transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_60%_at_20%_80%,rgba(168,85,247,0.06)_0%,transparent_60%)]" />
          <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-linear-to-t from-background via-background/95 to-transparent z-1" />
        </div>

        {/* Grid */}
        <div className="absolute inset-0 opacity-[0.04] bg-[linear-gradient(var(--color-text-primary)_1px,transparent_1px),linear-gradient(90deg,var(--color-text-primary)_1px,transparent_1px)] bg-size-[40px_40px]" />

        <div className="relative z-10 max-w-2xl w-full text-center">


          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-heading text-4xl sm:text-5xl md:text-6xl leading-none tracking-[-0.04em] text-text-primary mb-6"
          >
            {t.comingSoon.title}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-body-lg text-text-secondary max-w-xl mx-auto leading-relaxed mb-10"
          >
            {t.comingSoon.subtitle}
          </motion.p>

          {/* Email Form */}
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-3 justify-center items-stretch max-w-md mx-auto"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === "success"}
              placeholder={t.comingSoon.ctaPlaceholder}
              className={`w-full px-5 py-3 rounded-xl border bg-white dark:bg-surface text-text-primary outline-none transition-all duration-200 ${
                status === "error"
                  ? "border-error focus:border-error"
                  : "border-border focus:border-primary"
              }`}
            />
            <button
              type="submit"
              disabled={status === "success"}
              className={`w-full sm:w-auto whitespace-nowrap px-6 py-3 rounded-xl font-medium tracking-wide transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer ${
                status === "success"
                  ? "bg-success text-white border border-success cursor-default"
                  : "bg-obsidian hover:bg-obsidian/90 dark:bg-surface-bright dark:hover:bg-surface-bright/80 text-white dark:text-text-primary border border-border"
              }`}
            >
              {status === "success" ? (
                <>
                  <Check size={18} />
                  {t.comingSoon.ctaSuccess}
                </>
              ) : (
                <>
                  {t.comingSoon.ctaButton}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </motion.form>

          {/* Link to landing */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-8"
          >
            <Link
              href="/"
              className="text-sm text-text-secondary hover:text-text-primary transition-colors no-underline"
            >
              {t.comingSoon.landingLink}
            </Link>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <div className="w-6 h-10 rounded-full border-2 border-text-secondary/30 flex justify-center pt-2">
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-primary"
            />
          </div>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-4 md:px-8 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image src="/Logo.webp" alt="LatamLink Pay" width={24} height={24} className="size-6 object-contain" />
            <span className="text-sm text-text-secondary">
              &copy; {new Date().getFullYear()} LatamLink Pay
            </span>
          </div>
          <p className="text-xs text-text-secondary text-center">
            {t.comingSoon.footerNote}
          </p>
        </div>
      </footer>
    </div>
  )
}
