"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { usePrivy, useLogin } from "@privy-io/react-auth"
import { motion } from "framer-motion"
import { ShieldCheck } from "lucide-react"
import Link from "next/link"
import { Logo } from "@/components/Logo"

const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

// Login independiente del comerciante: no conoce el estado de onboarding ni
// del merchant store, solo decide si la sesión de Privy pertenece al
// allowlist de admins.
export default function AdminLoginPage() {
  const { authenticated, ready, user } = usePrivy()
  const router = useRouter()
  const [loggingIn, setLoggingIn] = useState(false)

  const { login } = useLogin({
    onComplete: () => setLoggingIn(false),
    onError: () => setLoggingIn(false),
  })

  useEffect(() => {
    if (!ready || !authenticated) return
    const email = (user?.email?.address ?? user?.google?.email ?? "").toLowerCase()
    router.replace(adminEmails.includes(email) ? "/admin" : "/")
  }, [ready, authenticated, user, router])

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(153,69,255,0.12)_0%,transparent_60%)]" />

      <header className="glass border-b border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 h-14 flex items-center">
          <Link href="/">
            <Logo size={36} />
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm space-y-8"
        >
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-2xl bg-electric-purple/10 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-electric-purple" />
              </div>
            </div>
            <h1 className="text-headline-xl font-heading text-on-surface">
              Admin Access
            </h1>
            <p className="text-sm text-on-surface-variant">
              Restricted to the LatamLink team.
            </p>
          </div>

          <div className="glass-strong rounded-xl p-6 space-y-4">
            <button
              disabled={loggingIn}
              onClick={() => {
                setLoggingIn(true)
                login()
              }}
              className="w-full flex items-center justify-center gap-2 bg-electric-purple hover:bg-electric-purple/90 text-white font-heading font-medium py-3 rounded-default transition-all text-sm disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              Continue with Email
            </button>

            {loggingIn && (
              <p className="text-xs text-on-surface-variant text-center">
                Opening sign in window...
              </p>
            )}
          </div>

          <p className="text-xs text-on-surface-variant/60 text-center">
            Not on the team? <Link href="/login" className="hover:text-on-surface transition-colors">Go to merchant sign in</Link>.
          </p>
        </motion.div>
      </main>
    </div>
  )
}
