"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Mail, Lock, ArrowRight, ArrowLeft, Check, Loader2, AlertCircle, ArrowRightToLine } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Logo } from "@/components/Logo"
import { useAuthStore } from "@/lib/store/useAuthStore"

export default function LoginPage() {
  const [step, setStep] = useState<"email" | "code">("email")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState(["", "", "", "", "", ""])
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const { login, isAuthenticated } = useAuthStore()

  const handleSendCode = useCallback(async () => {
    if (!email || !email.includes("@")) return
    setSending(true)
    setError("")
    await new Promise((r) => setTimeout(r, 1500))
    setSending(false)
    setSent(true)
    setStep("code")
  }, [email])

  const handleCodeChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return
    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)
    if (value && index < 5) {
      const next = document.getElementById(`code-${index + 1}`)
      next?.focus()
    }
  }

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      const prev = document.getElementById(`code-${index - 1}`)
      prev?.focus()
    }
  }

  const handleVerify = useCallback(async () => {
    const fullCode = code.join("")
    if (fullCode.length !== 6) return
    setVerifying(true)
    setError("")
    await new Promise((r) => setTimeout(r, 1200))
    if (fullCode === "123456") {
      const token = "sess_" + crypto.randomUUID().slice(0, 16)
      login(email, token)
      router.push("/onboarding")
    } else {
      setError("Invalid code. Try 123456")
      setVerifying(false)
    }
  }, [code, email, login, router])

  const handleResend = useCallback(async () => {
    setSent(false)
    setSending(true)
    await new Promise((r) => setTimeout(r, 1000))
    setSending(false)
    setSent(true)
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <header className="glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 h-14 flex items-center">
          <Link href="/">
            <Logo size={36} />
          </Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center py-16 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          {isAuthenticated ? (
            <motion.div
              key="already-in"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-strong rounded-xl p-8 text-center space-y-6"
            >
              <div className="w-14 h-14 rounded-xl bg-success/10 flex items-center justify-center mx-auto">
                <Check className="w-7 h-7 text-success" />
              </div>
              <div className="space-y-2">
                <h1 className="text-headline-lg font-heading text-on-surface">
                  Already Signed In
                </h1>
                <p className="text-sm text-on-surface-variant">
                  You&apos;re logged in. Go to your terminal to accept payments.
                </p>
              </div>
              <Link
                href="/portal/pos"
                className="block w-full bg-electric-purple hover:bg-electric-purple/90 text-white font-heading font-medium py-3 rounded-default transition-all duration-200 text-sm"
              >
                <span className="flex items-center justify-center gap-2">
                  Go to POS Terminal
                  <ArrowRightToLine className="w-4 h-4" />
                </span>
              </Link>
              <button
                onClick={() => { useAuthStore.getState().logout(); router.push("/") }}
                className="text-xs text-on-surface-variant hover:text-error transition-colors"
              >
                Sign out
              </button>
            </motion.div>
          ) : (
          <AnimatePresence mode="wait">
            {step === "email" ? (
              <motion.div
                key="email"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="glass-strong rounded-xl p-8 space-y-6"
              >
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 rounded-xl bg-electric-teal/10 flex items-center justify-center mx-auto">
                    <Mail className="w-7 h-7 text-electric-teal" />
                  </div>
                  <h1 className="text-headline-lg font-heading text-on-surface">
                    Get Started
                  </h1>
                  <p className="text-sm text-on-surface-variant">
                    Enter your email to receive a verification code
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-heading font-medium text-on-surface-variant uppercase tracking-wider">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendCode()}
                      className="w-full bg-surface-container-low border border-white/10 rounded-default pl-10 pr-4 py-3 text-sm text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-electric-teal/50 focus:ring-1 focus:ring-electric-teal/20 transition-all"
                      placeholder="merchant@tutienda.com"
                      autoFocus
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-error flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {error}
                  </p>
                )}

                <button
                  onClick={handleSendCode}
                  disabled={sending || !email.includes("@")}
                  className="w-full flex items-center justify-center gap-2 bg-electric-teal hover:bg-electric-teal/90 disabled:opacity-30 disabled:cursor-not-allowed text-on-secondary font-heading font-medium py-3 rounded-default transition-all duration-200 text-sm"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Verification Code
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <p className="text-xs text-on-surface-variant/60 text-center">
                  Dev mode: use any email, code will be <span className="font-mono text-on-surface-variant">123456</span>
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="code"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass-strong rounded-xl p-8 space-y-6"
              >
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 rounded-xl bg-electric-purple/10 flex items-center justify-center mx-auto">
                    <Lock className="w-7 h-7 text-electric-purple" />
                  </div>
                  <h1 className="text-headline-lg font-heading text-on-surface">
                    Check Your Email
                  </h1>
                  <p className="text-sm text-on-surface-variant">
                    We sent a 6-digit code to{" "}
                    <span className="text-on-surface font-heading">{email}</span>
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-heading font-medium text-on-surface-variant uppercase tracking-wider text-center block">
                    Verification Code
                  </label>
                  <div className="flex gap-2 justify-center">
                    {code.map((digit, i) => (
                      <input
                        key={i}
                        id={`code-${i}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleCodeChange(i, e.target.value)}
                        onKeyDown={(e) => handleCodeKeyDown(i, e)}
                        className="w-11 h-12 text-center bg-surface-container-low border border-white/10 rounded-default text-sm text-on-surface font-heading focus:outline-none focus:border-electric-purple/50 focus:ring-1 focus:ring-electric-purple/20 transition-all"
                        autoFocus={i === 0}
                      />
                    ))}
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-error flex items-center justify-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {error}
                  </p>
                )}

                <button
                  onClick={handleVerify}
                  disabled={verifying || code.join("").length !== 6}
                  className="w-full flex items-center justify-center gap-2 bg-electric-purple hover:bg-electric-purple/90 disabled:opacity-30 disabled:cursor-not-allowed text-white font-heading font-medium py-3 rounded-default transition-all duration-200 text-sm"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      Verify & Create Account
                      <Check className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between">
                  <button
                    onClick={() => { setStep("email"); setCode(["", "", "", "", "", ""]); setError("") }}
                    className="flex items-center gap-1 text-xs text-on-surface-variant hover:text-on-surface transition-colors"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    Change email
                  </button>
                  <button
                    onClick={handleResend}
                    disabled={sending}
                    className="text-xs text-electric-purple hover:text-electric-purple/80 disabled:opacity-30 transition-colors"
                  >
                    {sending ? "Resending..." : "Resend code"}
                  </button>
                </div>

                <p className="text-xs text-on-surface-variant/60 text-center">
                  Dev mode: enter <span className="font-mono text-on-surface-variant">123456</span>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          )}
        </motion.div>
      </main>
    </div>
  )
}
