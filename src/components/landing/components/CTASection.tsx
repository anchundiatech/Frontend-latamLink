"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { useLanguage } from "@/lib/i18n/LanguageProvider"

type Status = "idle" | "loading" | "success" | "error"

export function CTASection() {
  const { t, locale } = useLanguage()
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<Status>("idle")
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (status === "success") {
      const timer = setTimeout(() => {
        setStatus("idle")
        setEmail("")
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [status])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage("")

    if (!email || !email.includes("@")) {
      setStatus("error")
      setMessage(locale === "es" ? "Correo inválido" : "Invalid email")
      setTimeout(() => { setStatus("idle"); setMessage("") }, 2000)
      return
    }

    setStatus("loading")

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale }),
      })

      if (res.status === 409) {
        setStatus("success")
        return
      }

      if (!res.ok) {
        throw new Error("Server error")
      }

      setStatus("success")
    } catch {
      setStatus("error")
      setMessage(locale === "es" ? "Algo salió mal. Intenta de nuevo." : "Something went wrong. Try again.")
      setTimeout(() => { setStatus("idle"); setMessage("") }, 3000)
    }
  }

  return (
    <section id="contacto" className="bg-surface dark:bg-surface-dim border-t border-border py-24 text-center px-8 relative">
      <div className="max-w-4xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="font-heading text-4xl sm:text-5xl tracking-tight text-text-primary mb-4 max-w-xl mx-auto leading-tight"
        >
          {t.cta.title}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-text-secondary text-base max-w-md mx-auto mb-10 font-light"
        >
          {t.cta.subtitle}
        </motion.p>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          onSubmit={handleSubmit}
          className="flex flex-col sm:flex-row gap-3 justify-center items-stretch max-w-md mx-auto"
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === "loading" || status === "success"}
            placeholder={t.cta.placeholder}
            className={`w-full px-5 py-3 rounded-xl border bg-white dark:bg-surface text-text-primary outline-none transition-all duration-200 ${
              status === "error"
                ? "border-error focus:border-error"
                : "border-border focus:border-primary"
            }`}
          />
          <button
            type="submit"
            disabled={status === "loading" || status === "success"}
            className={`w-full sm:w-auto whitespace-nowrap px-6 py-3 rounded-xl font-medium tracking-wide transition-all shadow-sm ${
              status === "success"
                ? "bg-success text-white border border-success cursor-default"
                : "bg-obsidian hover:bg-obsidian/90 dark:bg-surface-bright dark:hover:bg-surface-bright/80 text-white dark:text-text-primary border border-border cursor-pointer"
            }`}
          >
            {status === "loading" ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {locale === "es" ? "Enviando..." : "Sending..."}
              </span>
            ) : status === "success" ? (
              t.cta.success
            ) : (
              t.cta.button
            )}
          </button>
        </motion.form>

        {message && (
          <motion.p
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-error mt-4"
          >
            {message}
          </motion.p>
        )}
      </div>
    </section>
  )
}
