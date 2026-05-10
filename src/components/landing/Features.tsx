"use client"

import { motion } from "framer-motion"
import {
  Zap,
  UserCheck,
  QrCode,
  PiggyBank,
  GitBranch,
  BarChart3,
} from "lucide-react"
import { useLanguage } from "@/lib/i18n/LanguageProvider"

const icons = [Zap, UserCheck, QrCode, PiggyBank, GitBranch, BarChart3]

export function Features() {
  const { t } = useLanguage()

  return (
    <section className="py-24 relative">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-headline-xl font-heading text-on-surface mb-4">
            {t.features.title}
          </h2>
          <p className="text-body-md text-on-surface-variant max-w-xl mx-auto">
            {t.features.subtitle}
          </p>
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {t.features.items.map((feature, i) => {
            const Icon = icons[i]
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="glass glass-hover rounded-lg p-6 group cursor-default"
              >
                <div className="w-10 h-10 rounded-lg bg-electric-purple/10 flex items-center justify-center mb-4 group-hover:bg-electric-purple/20 transition-colors">
                  <Icon className="w-5 h-5 text-electric-purple" />
                </div>
                <h3 className="text-sm font-heading font-medium text-on-surface mb-2">
                  {feature.title}
                </h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
