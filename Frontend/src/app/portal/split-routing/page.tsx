"use client"

import { motion } from "framer-motion"
import { GitBranch, Clock } from "lucide-react"

export default function SplitRoutingPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-xl p-8 sm:p-10 text-center"
      >
        <div className="w-14 h-14 rounded-2xl bg-electric-purple/10 flex items-center justify-center mx-auto mb-5">
          <GitBranch className="w-6 h-6 text-electric-purple" />
        </div>

        <span className="inline-flex items-center gap-1.5 text-[11px] font-heading font-medium text-accent-alert bg-accent-alert/10 px-2.5 py-1 rounded-full mb-4">
          <Clock className="w-3 h-3" />
          Próximamente
        </span>

        <h2 className="text-headline-lg font-heading text-on-surface mb-2">
          Estamos trabajando aún en esta función
        </h2>
        <p className="text-sm text-on-surface-variant max-w-md mx-auto">
          Te avisaremos cuando esté activa.
        </p>
      </motion.div>
    </div>
  )
}
