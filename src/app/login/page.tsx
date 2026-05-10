"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { usePrivy } from "@privy-io/react-auth"
import { useMerchantStore } from "@/lib/store/useMerchantStore"
import { motion } from "framer-motion"
import { Logo } from "@/components/Logo"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import Link from "next/link"
import { useLanguage } from "@/lib/i18n/LanguageProvider"


export default function LoginPage() {
  const { login, authenticated, ready, user, logout } = usePrivy()
  const router = useRouter()
  const [loggingIn, setLoggingIn] = useState(false)
  const { t } = useLanguage()


  useEffect(() => {
    if (authenticated && ready) {
      const currentUserId = user?.id ?? ""
      const { userId: storedUserId, isActive, walletAddress } = useMerchantStore.getState()

      if (storedUserId && storedUserId !== currentUserId) {
        useMerchantStore.getState().reset()
      }

      const store = useMerchantStore.getState()
      store.setMerchant({ userId: currentUserId || storedUserId })

      const resolvedAddress = store.walletAddress || user?.wallet?.address || ""
      if (!store.walletAddress && resolvedAddress) {
        store.setWalletAddress(resolvedAddress)
      }

      router.replace(store.isActive && resolvedAddress ? "/portal/pos" : "/onboarding")
    }
  }, [authenticated, ready, router, user])

  if (authenticated && ready) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="glass border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 h-14 flex items-center justify-between">
            <Link href="/">
              <Logo size={36} />
            </Link>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-strong rounded-xl p-8 max-w-sm w-full text-center space-y-6"
          >
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h1 className="text-headline-lg font-heading text-on-surface mb-1">Already Signed In</h1>
              <p className="text-sm text-on-surface-variant">{user?.email?.address ?? user?.google?.email ?? "Connected"}</p>
            </div>
            <Link
              href="/portal/pos"
              className="block w-full bg-electric-purple hover:bg-electric-purple/90 text-white font-heading font-medium py-3 rounded-default transition-all text-sm"
            >
              Go to POS Terminal
            </Link>
            <button
              onClick={() => logout()}
              className="text-xs text-on-surface-variant hover:text-on-surface transition-colors"
            >
              Sign out
            </button>
          </motion.div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 h-14 flex items-center justify-between">
          <Link href="/">
            <Logo size={36} />
          </Link>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm space-y-8"
        >
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <Logo size={48} />
            </div>
            <h1 className="text-headline-xl font-heading text-on-surface">
              {t.welcome.title}
            </h1>
            <p className="text-sm text-on-surface-variant">
              {t.welcome.subtitle}
            </p>
          </div>

          <div className="glass-strong rounded-xl p-6 space-y-4">
            <button
              disabled={loggingIn}
              onClick={() => {
                setLoggingIn(true)
                login()
              }}
              className="w-full flex items-center justify-center gap-2 bg-electric-purple hover:bg-electric-purple/90 text-white font-heading font-medium py-3 rounded-default transition-all text-sm"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Continue with Email
            </button>

            {loggingIn && (
              <p className="text-xs text-on-surface-variant text-center">
                Opening sign in window...
              </p>
            )}
          </div>

          <p className="text-xs text-on-surface-variant/60 text-center">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </motion.div>
      </main>
    </div>
  )
}
