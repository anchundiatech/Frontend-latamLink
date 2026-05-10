"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard"
import { motion } from "framer-motion"
import Link from "next/link"
import { Logo } from "@/components/Logo"
import { usePrivy } from "@privy-io/react-auth"

export default function OnboardingPage() {
  const [checking, setChecking] = useState(true)
  const { authenticated } = usePrivy()
  const router = useRouter()

  useEffect(() => {
    if (!authenticated) {
      router.replace("/login")
    } else {
      setChecking(false)
    }
  }, [authenticated, router])

  if (checking) return null

  return (
    <div className="min-h-screen flex flex-col">
      <header className="glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 h-14 flex items-center justify-between">
          <Link href="/">
            <Logo size={36} />
          </Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center py-16 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl"
        >
          <OnboardingWizard />
        </motion.div>
      </main>
    </div>
  )
}
