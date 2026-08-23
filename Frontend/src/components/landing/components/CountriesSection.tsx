"use client"

import { motion } from "framer-motion"
import { useLanguage } from "@/lib/i18n/LanguageProvider"
import { ArrowRight } from "lucide-react"

export default function CountriesSection() {
  const { t } = useLanguage()

  return (
    <section className="bg-obsidian text-white py-24 px-8 text-center relative overflow-hidden">
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.08),transparent_50%)] pointer-events-none" />

      <div className="max-w-3xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-primary uppercase tracking-[0.2em] text-xs font-semibold mb-4">
            {t.countries.badge}
          </div>
          <h2 className="font-heading text-5xl sm:text-6xl tracking-tight leading-[0.95] mb-5 text-white">
            {t.countries.title}
          </h2>
          <p className="text-text-secondary text-base max-w-xl mx-auto mb-10 font-light opacity-90">
            {t.countries.subtitle}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-wrap gap-4 justify-center mb-12"
        >
          {t.countries.list.map((country) => (
            <div
              key={country.name}
              className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-full px-6 py-3 text-sm font-medium hover:bg-white/10 transition-colors"
            >
              <span className="text-xl" role="img" aria-label={country.name}>
                {country.flag}
              </span>
              <span>{country.name}</span>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <a
            href="#contacto"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/95 text-obsidian px-6 py-3.5 rounded-xl font-medium tracking-wide shadow-lg shadow-primary/10 transition-all hover:scale-[1.02]"
          >
            {t.countries.cta}
            <ArrowRight size={16} />
          </a>
        </motion.div>
      </div>
    </section>
  )
}
