"use client"

import { motion } from "framer-motion"
import { useLanguage } from "@/lib/i18n/LanguageProvider"
import { ExternalLink, UserRound } from "lucide-react"

const teamGradients = [
  "from-primary to-accent-blue",
  "from-accent-blue to-secondary",
  "from-secondary to-primary",
  "from-primary to-secondary",
]

export default function TeamSection() {
  const { t, locale } = useLanguage()

  return (
    <section id="nosotros" className="max-w-6xl mx-auto px-8 py-28 text-center">
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
        <h2 className="font-heading text-5xl sm:text-6xl tracking-tight text-text-primary leading-[0.95]">
          {t.team.title}
        </h2>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {t.team.members.map((member, i) => {
          const gradient = teamGradients[i % teamGradients.length]
          if (member.pending) {
            return (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className="border border-dashed border-border rounded-3xl p-8 flex flex-col items-center justify-center opacity-60"
              >
                <div className="w-16 h-16 rounded-2xl bg-surface-dim dark:bg-surface-bright flex items-center justify-center mb-5">
                  <UserRound className="w-6 h-6 text-text-secondary" />
                </div>
                <p className="text-sm font-medium text-text-secondary">{member.role}</p>
                <p className="text-xs text-text-secondary/70 mt-2">
                  {locale === "es" ? "Próximamente" : "Coming soon"}
                </p>
              </motion.div>
            )
          }
          return (
            <motion.div
              key={member.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
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
