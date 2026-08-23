"use client"

import { motion } from "framer-motion"
import { useLanguage } from "@/lib/i18n/LanguageProvider"

export default function SocialProofSection() {
  const { t } = useLanguage()

  return (
    <section className="border-y border-border bg-surface dark:bg-surface-dim px-8 py-14">
      <div className="max-w-5xl mx-auto flex items-center justify-center gap-12 md:gap-16 flex-wrap">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col items-center gap-3"
        >
          <span className="text-xs uppercase tracking-[0.15em] text-text-secondary font-medium">
            {t.socialProof.label}
          </span>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <img
                src="/logos/dev3pack-logo.ico"
                alt="Dev3Pack"
                className="w-10 h-10 rounded-lg object-contain"
              />
              <span className="text-sm font-medium text-text-primary whitespace-nowrap leading-tight">
                {t.socialProof.accelerator}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <img
                src="/logos/wayLearn.jpg"
                alt="Waylearn"
                className="w-10 h-10 rounded-lg object-cover"
              />
              <div className="text-left">
                <p className="text-sm font-medium text-text-primary whitespace-nowrap leading-tight">
                  Waylearn
                </p>
                <p className="text-[11px] text-text-secondary whitespace-nowrap leading-tight">
                  x Solana Latam Lab
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="flex flex-col items-center gap-3"
        >
          <span className="text-xs uppercase tracking-[0.15em] text-text-secondary font-medium">
            {t.socialProof.stack}
          </span>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <img
                src="/logos/dev3pack-logo.ico"
                alt="Dev3Pack"
                className="w-10 h-10 rounded-lg object-contain"
              />
              <span className="text-sm font-medium text-text-primary">Dev3Pack</span>
            </div>
            <div className="flex items-center gap-3">
              <img
                src="/logos/Solana_logo.png"
                alt="Solana"
                className="w-8 h-8 object-contain"
              />
              <span className="text-sm font-semibold text-primary">Solana</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
