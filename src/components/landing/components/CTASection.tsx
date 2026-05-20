"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { useLanguage } from "@/lib/i18n/LanguageProvider"

export function CTASection() {
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
            disabled={status === "success"}
            placeholder={t.cta.placeholder}
            className={`w-full px-5 py-3 rounded-xl border bg-white dark:bg-surface text-text-primary outline-none transition-all duration-200 ${
              status === "error"
                ? "border-error focus:border-error"
                : "border-border focus:border-primary"
            }`}
          />
          <button
            type="submit"
            disabled={status === "success"}
            className={`w-full sm:w-auto whitespace-nowrap px-6 py-3 rounded-xl font-medium tracking-wide transition-all shadow-sm ${
              status === "success"
                ? "bg-success text-white border border-success cursor-default"
                : "bg-obsidian hover:bg-obsidian/90 dark:bg-surface-bright dark:hover:bg-surface-bright/80 text-white dark:text-text-primary border border-border"
            }`}
          >
            {status === "success" ? t.cta.success : t.cta.button}
          </button>
        </motion.form>
      </div>
    </section>
  )
}
