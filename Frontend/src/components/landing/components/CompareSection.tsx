"use client"

import { motion } from "framer-motion"
import { useLanguage } from "@/lib/i18n/LanguageProvider"

export default function CompareSection() {
  const { t } = useLanguage()

  return (
    <section className="max-w-6xl mx-auto px-8 py-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mb-12"
      >
        <div className="text-primary uppercase tracking-[0.2em] text-xs font-medium mb-4">
          {t.compare.title}
        </div>
        <h2 className="font-heading text-4xl sm:text-5xl tracking-tight text-text-primary leading-tight">
          {t.compare.subtitle}
        </h2>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="overflow-x-auto border border-border rounded-3xl bg-white dark:bg-surface shadow-sm"
      >
        <table className="w-full border-collapse text-left min-w-150">
          <thead>
            <tr className="border-b border-border">
              <th className="p-5 text-sm font-medium text-text-secondary w-1/3"></th>
              <th className="p-5 text-sm font-medium text-text-secondary bg-surface-dim/40 dark:bg-surface-dim/60 w-1/3 text-center">
                {t.compare.headers[0]}
              </th>
              <th className="p-5 text-sm font-semibold text-white bg-obsidian dark:bg-surface-bright w-1/3 text-center">
                {t.compare.headers[1]}
              </th>
            </tr>
          </thead>
          <tbody>
            {t.compare.features.map((feature) => (
              <tr key={feature.name} className="border-b border-border last:border-0 hover:bg-surface-dim/10 dark:hover:bg-surface-bright/10 transition-colors">
                <td className="p-5 text-sm font-medium text-text-primary">
                  {feature.name}
                </td>
                <td className="p-5 text-center bg-surface-dim/40 dark:bg-surface-dim/60">
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-300">
                    {feature.them}
                  </span>
                </td>
                <td className="p-5 text-center font-medium text-text-primary bg-primary/5 dark:bg-primary/10">
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-success/15 text-success">
                    {feature.us}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </section>
  )
}
