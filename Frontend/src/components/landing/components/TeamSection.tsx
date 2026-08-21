"use client"

import { motion } from "framer-motion"
import { useLanguage } from "@/lib/i18n/LanguageProvider"
import { ExternalLink } from "lucide-react"

const teamGradients = [
  "from-[#2dd4bf] to-[#0891b2]",
  "from-[#a855f7] to-[#7c3aed]",
  "from-[#4d8eff] to-[#1d4ed8]"
]

export default function TeamSection() {
  const { t } = useLanguage()

  return (
    <section id="nosotros" className="max-w-6xl mx-auto px-8 py-24 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mb-16"
      >
        <div className="text-primary uppercase tracking-[0.2em] text-xs font-semibold mb-4">
          {t.team.badge}
        </div>
        <h2 className="font-heading text-4xl sm:text-5xl tracking-tight text-text-primary leading-tight">
          {t.team.title}
        </h2>
      </motion.div>

      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
        {t.team.members.map((member, i) => {
          const gradient = teamGradients[i] || "from-primary to-secondary"
          return (
            <motion.div
              key={member.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="bg-white dark:bg-surface border border-border rounded-3xl p-8 hover:border-primary transition-all duration-300 flex flex-col items-center"
            >
              <div className={`w-16 h-16 rounded-2xl bg-linear-to-br ${gradient} text-white font-heading font-semibold text-xl flex items-center justify-center mb-5 shadow-inner`}>
                {member.initials}
              </div>
              <h3 className="font-heading font-medium text-lg text-text-primary mb-1">
                {member.name}
              </h3>
              <p className="text-sm text-text-secondary mb-2 font-medium">
                {member.role}
              </p>
              {member.bio && (
                <p className="text-xs text-text-secondary leading-relaxed mb-4 max-w-xs">
                  {member.bio}
                </p>
              )}
              <p className="text-xs text-text-secondary bg-surface-dim/50 dark:bg-surface-bright/20 rounded-full px-3 py-1 font-light mb-3">
                {member.location}
              </p>
              {member.linkedin && member.linkedin !== "#" && (
                <a
                  href={member.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-secondary hover:text-primary transition-colors"
                >
                  <ExternalLink size={16} />
                </a>
              )}
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
