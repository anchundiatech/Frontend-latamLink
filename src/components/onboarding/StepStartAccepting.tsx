"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Check, ArrowRight, PartyPopper } from "lucide-react"
import Link from "next/link"
import { useMerchantStore } from "@/lib/store/useMerchantStore"

export function StepStartAccepting() {
  const [show, setShow] = useState(false)
  const { name } = useMerchantStore()
  const router = useRouter()
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const showTimer = setTimeout(() => setShow(true), 500)
    redirectTimerRef.current = setTimeout(() => router.replace("/portal/pos"), 6000)
    return () => {
      clearTimeout(showTimer)
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current)
    }
  }, [router])

  // If the merchant starts reading or reaching for a button, don't yank
  // them away with the automatic redirect.
  const cancelAutoRedirect = () => {
    if (redirectTimerRef.current) {
      clearTimeout(redirectTimerRef.current)
      redirectTimerRef.current = null
    }
  }

  return (
    <div
      className="glass-strong rounded-xl p-8 text-center space-y-6"
      onPointerMove={cancelAutoRedirect}
      onPointerDown={cancelAutoRedirect}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, delay: 0.5 }}
        className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Check className="w-10 h-10 text-success" />
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <h2 className="text-headline-xl font-heading text-on-surface">
            You're All Set!
          </h2>
          <PartyPopper className="w-6 h-6 text-warning" />
        </div>
        <p className="text-sm text-on-surface-variant">
          Your POS terminal for <span className="text-on-surface font-heading">{name}</span> is ready.
          Start accepting payments in minutes.
        </p>
      </motion.div>

      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="glass rounded-lg p-4 grid grid-cols-2 gap-4 text-left">
            {[
              { label: "Terminal", value: "Active" },
              { label: "QR Code", value: "Generated" },
              { label: "Split Routing", value: "Configured" },
              { label: "Ready for", value: "Digital Payments" },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-xs text-on-surface-variant">{item.label}</p>
                <p className="text-sm font-heading text-on-surface">
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <Link
            href="/portal/pos"
            className="block w-full bg-electric-purple hover:bg-electric-purple/90 text-white font-heading font-medium px-6 py-3 rounded-default transition-all duration-200 text-sm"
          >
            <span className="flex items-center justify-center gap-2">
              Go to POS Terminal
              <ArrowRight className="w-4 h-4" />
            </span>
          </Link>
          <Link
            href="/portal/dashboard"
            className="block w-full glass glass-hover text-on-surface font-heading font-medium px-6 py-3 rounded-default transition-all duration-200 text-sm"
          >
            View Dashboard
          </Link>
        </motion.div>
      )}
    </div>
  )
}
