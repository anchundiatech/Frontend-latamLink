"use client"

import { motion } from "framer-motion"
import { useLanguage } from "@/lib/i18n/LanguageProvider"

export default function ManifestoSection() {
  const { t } = useLanguage()

  return (
    <section className="max-w-6xl mx-auto px-8 py-24 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <div className="text-primary uppercase tracking-[0.2em] text-xs font-semibold mb-4">
          {t.manifesto.badge}
        </div>
        <blockquote className="max-w-3xl mx-auto">
          <p className="font-heading text-2xl sm:text-3xl md:text-4xl tracking-tight text-text-primary leading-tight mb-6">
            &ldquo;{t.manifesto.title}&rdquo;
          </p>
          <p className="text-text-secondary text-base leading-relaxed max-w-2xl mx-auto">
            {t.manifesto.body}
          </p>
        </blockquote>
      </motion.div>
    </section>
  )
}
