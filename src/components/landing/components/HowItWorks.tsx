"use client"

import { Check, Smartphone, Store } from "lucide-react"



const steps = [
  {
    number: "01",
    icon: <Store className="hover:text-primary"  />,
    title: "Registrás tu negocio",
    desc: "En 5 minutos configurás tu perfil."
  },
  {
    number: "02",
    icon: <Smartphone />,
    title: "Mostrás el QR",
    desc: "Tu cliente escanea y paga."
  },
  {
    number: "03",
    icon: <Check className="text-pretty" />,
    title: "El dinero llega",
    desc: "Liquidación instantánea."
  }
]

export default function HowItWorksSection() {
  return (
    <section
      id="como-funciona"
      className="max-w-6xl mx-auto px-8 py-28"
    >

      <div className="text-primary uppercase tracking-[0.2em] text-xs font-medium mb-4">
        Cómo funciona
      </div>

      <h2 className="font-heading text-5xl tracking-tight mb-5">
        Tan fácil como cobrar en efectivo
      </h2>

      <p className="text-text-secondary max-w-2xl leading-relaxed mb-16">
        No necesitas saber de tecnología.
      </p>

      <div className="grid md:grid-cols-3 gap-6">

        {steps.map((step) => (
          <div
            key={step.number}
            className="bg-white dark:bg-surface border border-border rounded-3xl p-8 hover:border-primary transition-all"
          >

            <div className="font-heading text-6xl opacity-20 mb-5">
              {step.number}
            </div>

            <div className="text-3xl mb-5 ">
              {step.icon}
            </div>

            <h3 className="font-semibold text-lg mb-3">
              {step.title}
            </h3>

            <p className="text-text-secondary leading-relaxed">
              {step.desc}
            </p>

          </div>
        ))}

      </div>

    </section>
  )
}