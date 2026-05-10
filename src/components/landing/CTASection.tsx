"use client"

import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/lib/i18n/LanguageProvider"

export function CTASection() {
  const { t } = useLanguage()

  return (
    <section className="py-24 relative">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-strong rounded-xl p-12 text-center relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.08),transparent_70%)]" />
          <div className="relative">
            <h2 className="text-headline-xl font-heading text-on-surface mb-4">
              {t.cta.title}
            </h2>
            <p className="text-body-md text-on-surface-variant max-w-lg mx-auto mb-8">
              {t.cta.subtitle}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 bg-electric-purple hover:bg-electric-purple/90 text-white font-heading font-medium px-6 py-3 rounded-default transition-all duration-200"
              >
                {t.cta.button}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <p className="text-xs text-on-surface-variant mt-4">
              {t.cta.footnote}
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
