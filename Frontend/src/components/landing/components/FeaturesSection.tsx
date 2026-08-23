"use client"

import { motion } from "framer-motion"
import { useLanguage } from "@/lib/i18n/LanguageProvider"

const featureEmojis = ["💵", "⚡", "🔀", "🚫"]
const featureIconColors = [
  "bg-primary/12 text-primary",
  "bg-secondary/10 text-secondary",
  "bg-accent-blue/10 text-accent-blue",
  "bg-error/10 text-error"
]

export function Features() {
  const { t } = useLanguage()

  return (
    <section id="beneficios" className="bg-surface dark:bg-surface-dim border-y border-border py-24 relative">
      <div className="max-w-6xl mx-auto px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <div className="text-primary uppercase tracking-[0.2em] text-xs font-medium mb-4">
            {t.features.eyebrow}
          </div>
          <h2 className="font-heading text-5xl sm:text-6xl tracking-tight text-text-primary leading-[0.95] mb-4">
            {t.features.title}
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {t.features.items.map((feature, i) => {
            const emoji = featureEmojis[i] || "✨"
            const iconBg = featureIconColors[i] || "bg-primary/10"
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="flex gap-5 bg-white dark:bg-surface border border-border rounded-3xl p-8 hover:border-primary transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${iconBg}`}>
                  {emoji}
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-text-primary mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-text-secondary leading-relaxed text-sm font-light">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
