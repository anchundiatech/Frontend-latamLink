"use client"


import { useLanguage } from "@/lib/i18n/LanguageProvider"
import { Check, Smartphone, Store } from "lucide-react"


const stepIcons = [
  <Store key="store" className="hover:text-primary" />,
  <Smartphone key="phone" />,
  <Check key="check" className="text-pretty" />
]

export default function HowItWorksSection() {

  const { t } = useLanguage()
  return (
    <section
      id="como-funciona"
      className="max-w-6xl mx-auto px-8 py-28"
    >

      <div className="text-primary uppercase tracking-[0.2em] text-xs font-medium mb-4">
        {t.howItWorks.title}
      </div>

      <h2 className="font-heading text-5xl tracking-tight mb-5">
        {t.howItWorks.subtitle}
      </h2>

      <p className="text-text-secondary max-w-2xl leading-relaxed mb-16">
        {t.howItWorks.description}
      </p>

      <div className="grid md:grid-cols-3 gap-6">

        {t.howItWorks.steps.map((step, i) => {
          const number = `0${i + 1}`
          const icon = stepIcons[i]
          return (
            <div
              key={number}
              className="bg-white dark:bg-surface border border-border rounded-3xl p-8 hover:border-primary transition-all"
            >

              <div className="font-heading text-6xl opacity-20 mb-5">
                {number}
              </div>

              <div className="text-3xl mb-5 ">
                {icon}
              </div>

              <h3 className="font-semibold text-lg mb-3">
                {step.title}
              </h3>

              <p className="text-text-secondary leading-relaxed">
                {step.description}
              </p>

            </div>
          )
        })}

      </div>

    </section>
  )
}