"use client"

import { motion } from "framer-motion"
import { useLanguage } from "@/lib/i18n/LanguageProvider"

export default function SocialProofSection() {
  const { t } = useLanguage()

  return (
    <section className="border-y border-border bg-surface dark:bg-surface-dim px-8 py-12">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-center gap-10 md:gap-16">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col items-center gap-3"
        >
          <span className="text-xs uppercase tracking-[0.15em] text-text-secondary font-medium">
            {t.socialProof.label}
          </span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white dark:bg-surface-bright/10 border border-border rounded-xl px-4 py-2.5">
              <div className="w-8 h-8 rounded-lg bg-linear-to-br from-[#2dd4bf] to-[#0891b2] flex items-center justify-center text-white font-bold text-[10px] leading-tight text-center">
                D3P
              </div>
              <span className="text-sm font-medium text-text-primary">
                {t.socialProof.accelerator}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-white dark:bg-surface-bright/10 border border-border rounded-xl px-4 py-2.5">
              <div className="w-8 h-8 rounded-lg bg-linear-to-br from-[#9945FF] to-[#7c3aed] flex items-center justify-center text-white font-bold text-[10px] leading-tight text-center">
                W S
              </div>
              <span className="text-sm font-medium text-text-primary">
                {t.socialProof.incubator}
              </span>
            </div>
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
