"use client"

import { motion } from "framer-motion"
import { useLanguage } from "@/lib/i18n/LanguageProvider"

export default function SocialProofSection() {
  const { t } = useLanguage()

  return (
    <section className="border-y border-border bg-surface dark:bg-surface-dim px-8 py-12">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-center gap-10 md:gap-20">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col items-center gap-3"
        >
          <span className="text-xs uppercase tracking-[0.15em] text-text-secondary font-medium">
            {t.socialProof.label}
          </span>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-obsidian flex items-center justify-center text-white font-bold text-xs">
              PAL
            </div>
            <span className="text-sm font-medium text-text-primary">
              {t.socialProof.accelerator}
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 }}
          className="flex flex-col items-center gap-3"
        >
          <span className="text-xs uppercase tracking-[0.15em] text-text-secondary font-medium">
            {t.socialProof.stack}
          </span>
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-[#9945FF]">Solana</span>
            <span className="text-xs text-text-secondary">+</span>
            <span className="text-sm font-semibold text-[#2775CA]">USDC</span>
            <span className="text-xs text-text-secondary">+</span>
            <span className="text-sm font-semibold text-[#0052FF]">Circle</span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
