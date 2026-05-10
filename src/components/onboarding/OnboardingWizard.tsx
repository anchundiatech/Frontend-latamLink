"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check } from "lucide-react"
import { StepCreateBusiness } from "./StepCreateBusiness"
import { StepConfigureTerminal } from "./StepConfigureTerminal"
import { StepStartAccepting } from "./StepStartAccepting"

const steps = [
  { id: 1, label: "Create Account" },
  { id: 2, label: "Configure Terminal" },
  { id: 3, label: "Start Selling" },
]

export function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(1)

  const handleNext = () => {
    if (currentStep < 3) setCurrentStep((prev) => prev + 1)
  }

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep((prev) => prev - 1)
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-12">
        {steps.map((step, i) => (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-heading font-medium transition-all duration-300 ${
                  currentStep > step.id
                    ? "bg-electric-teal text-on-secondary"
                    : currentStep === step.id
                      ? "bg-electric-purple text-white"
                      : "bg-surface-container text-on-surface-variant"
                }`}
              >
                {currentStep > step.id ? (
                  <Check className="w-4 h-4" />
                ) : (
                  step.id
                )}
              </div>
              <span
                className={`text-xs mt-2 font-heading text-center ${
                  currentStep >= step.id
                    ? "text-on-surface"
                    : "text-on-surface-variant"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-px mx-3 -mt-6 ${
                  currentStep > step.id
                    ? "bg-electric-teal/50"
                    : "bg-surface-container-highest"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {currentStep === 1 && (
            <StepCreateBusiness onNext={handleNext} />
          )}
          {currentStep === 2 && (
            <StepConfigureTerminal onNext={handleNext} onPrev={handlePrev} />
          )}
          {currentStep === 3 && (
            <StepStartAccepting />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
