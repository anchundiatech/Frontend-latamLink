"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Building2, ArrowRight, Globe, Mail, CheckCircle, Loader2 } from "lucide-react"
import { usePrivy } from "@privy-io/react-auth"
import { z } from "zod"
import { useMerchantStore } from "@/lib/store/useMerchantStore"
import { useCuentaDePago } from "@/lib/services/useCuentaDePago"

const businessSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Business name must be at least 2 characters")
    .max(50, "Business name must be 50 characters or less"),
  email: z.string().trim().email("Enter a valid email address"),
})

export function StepCreateBusiness({ onNext }: { onNext: () => void }) {
  const { setMerchant, setWalletAddress } = useMerchantStore()
  const cuentaDePago = useCuentaDePago()
  const { user } = usePrivy()
  const [form, setForm] = useState({
    name: "",
    email: user?.email?.address ?? user?.google?.email ?? "",
    country: "Mexico",
  })
  const [status, setStatus] = useState<"idle" | "done">("idle")
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({})

  // Privy crea la cuenta de pago apenas el comerciante entra con Google; hasta
  // que exista no sabemos dónde asociar el comercio. No hay nada que conectar.
  const walletReady = !!cuentaDePago

  // Signup never touches the blockchain: QR payments go straight to the
  // merchant's account, so the terminal is usable the moment we know the
  // address. On-chain setup (split routing) happens lazily, sponsored by
  // the platform — the merchant only ever receives money, never funds it.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (status !== "idle" || !cuentaDePago) return

    const result = businessSchema.safeParse(form)
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors
      setErrors({ name: fieldErrors.name?.[0], email: fieldErrors.email?.[0] })
      return
    }

    setErrors({})
    setMerchant({ name: result.data.name, email: result.data.email, isActive: true })
    setWalletAddress(cuentaDePago)
    setStatus("done")
    setTimeout(() => onNext(), 1500)
  }

  if (status === "done") {
    return (
      <div className="glass-strong rounded-xl p-8 text-center space-y-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto"
        >
          <CheckCircle className="w-10 h-10 text-success" />
        </motion.div>
        <div>
          <h2 className="text-headline-lg font-heading text-on-surface mb-2">
            Account Created!
          </h2>
          <p className="text-sm text-on-surface-variant">
            Welcome, {form.name}. Your payment terminal is ready.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-strong rounded-xl p-8 space-y-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
        className="w-16 h-16 rounded-xl bg-electric-teal/10 flex items-center justify-center mx-auto"
      >
        <Building2 className="w-8 h-8 text-electric-teal" />
      </motion.div>
      <div className="text-center">
        <h2 className="text-headline-lg font-heading text-on-surface mb-2">
          Create Your Business Account
        </h2>
        <p className="text-sm text-on-surface-variant">
          Set up your merchant profile. Your payment terminal will be ready in seconds.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-heading font-medium text-on-surface-variant uppercase tracking-wider">
            Business Name
          </label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-surface-container-low border border-white/10 rounded-default pl-10 pr-4 py-3 text-sm text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-electric-teal/50 focus:ring-1 focus:ring-electric-teal/20 transition-all disabled:opacity-60"
              placeholder="Mi Tienda"
              required
            />
          </div>
          {errors.name && <p className="text-xs text-error">{errors.name}</p>}
        </div>
        <div className="space-y-2">
          <label className="text-xs font-heading font-medium text-on-surface-variant uppercase tracking-wider">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full bg-surface-container-low border border-white/10 rounded-default pl-10 pr-4 py-3 text-sm text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-electric-teal/50 focus:ring-1 focus:ring-electric-teal/20 transition-all disabled:opacity-60"
              placeholder="merchant@tutienda.com"
              required
            />
          </div>
          {errors.email && <p className="text-xs text-error">{errors.email}</p>}
        </div>
        <div className="space-y-2">
          <label className="text-xs font-heading font-medium text-on-surface-variant uppercase tracking-wider">
            Country
          </label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
            <select
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              className="w-full bg-surface-container-low border border-white/10 rounded-default pl-10 pr-4 py-3 text-sm text-on-surface focus:outline-none focus:border-electric-teal/50 focus:ring-1 focus:ring-electric-teal/20 transition-all appearance-none cursor-pointer disabled:opacity-60"
            >
              {["Argentina", "Bolivia", "Brazil", "Chile", "Colombia", "Costa Rica", "Ecuador", "El Salvador", "Guatemala", "Honduras", "Mexico", "Nicaragua", "Panama", "Paraguay", "Peru", "Uruguay", "Venezuela"].map((c) => (
                <option key={c} value={c} className="bg-surface-container">{c}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={status !== "idle" || !walletReady}
          className="w-full flex items-center justify-center gap-2 bg-electric-teal hover:bg-electric-teal/90 disabled:opacity-50 disabled:cursor-not-allowed text-on-secondary font-heading font-medium px-6 py-3 rounded-default transition-all duration-200 text-sm mt-2"
        >
          {!walletReady ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Preparing your account...
            </>
          ) : (
            <>
              Create Business Account
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <p className="text-xs text-on-surface-variant text-center">
        Free to start. No credit card required. Your payment terminal will be ready instantly.
      </p>
    </div>
  )
}
