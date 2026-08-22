"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, PartyPopper, ArrowRight } from "lucide-react"

export function PaymentSuccess({ onDone }: { onDone: () => void }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setShow(true), 300)
    // Auto-dismiss as a fallback; the button below closes it immediately.
    const t2 = setTimeout(() => onDone(), 5000)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [onDone])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="glass-strong rounded-xl p-12 text-center max-w-sm mx-4"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-6"
            >
              <Check className="w-10 h-10 text-success" />
            </motion.div>
            <motion.h3
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-headline-lg font-heading text-on-surface mb-2"
            >
              Payment Successful!
            </motion.h3>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex items-center justify-center gap-2 text-sm text-on-surface-variant mb-6"
            >
              <PartyPopper className="w-4 h-4 text-warning" />
              <span>Funds distributed to your accounts</span>
            </motion.div>
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              onClick={onDone}
              className="w-full flex items-center justify-center gap-2 bg-electric-purple hover:bg-electric-purple/90 text-white font-heading font-medium py-3 rounded-default transition-all duration-200 text-sm"
            >
              New Sale
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
