"use client"

import { motion } from "framer-motion"
import { UserPlus, QrCode, Zap, BarChart3 } from "lucide-react"
import { useLanguage } from "@/lib/i18n/LanguageProvider"

const icons = [UserPlus, QrCode, Zap, BarChart3]

export function HowItWorks() {
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
            {t.howItWorks.title}
          </h2>
          <p className="text-body-md text-on-surface-variant max-w-xl mx-auto">
            {t.howItWorks.subtitle}
          </p>
        </motion.div>
        <div className="grid md:grid-cols-4 gap-6 relative">
          <div className="hidden md:block absolute top-12 left-[12.5%] right-[12.5%] h-px bg-linear-to-r from-electric-purple/0 via-electric-purple/50 to-electric-teal/0" />
          {t.howItWorks.steps.map((step, i) => {
            const Icon = icons[i]
            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass rounded-lg p-6 text-center relative"
              >
                <div className="w-12 h-12 rounded-lg bg-electric-purple/10 flex items-center justify-center mx-auto mb-4 relative z-10">
                  <Icon className="w-5 h-5 text-electric-purple" />
                </div>
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-electric-purple/20 flex items-center justify-center text-xs font-heading text-electric-purple">
                  {i + 1}
                </div>
                <h3 className="text-sm font-heading font-medium text-on-surface mb-2">
                  {step.title}
                </h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
