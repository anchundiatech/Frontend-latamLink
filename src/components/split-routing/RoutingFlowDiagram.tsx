"use client"

import { motion } from "framer-motion"
import { ArrowDown, DollarSign } from "lucide-react"

const colors = ["#a855f7", "#2dd4bf", "#adc6ff"]

interface RoutingFlowDiagramProps {
  destinations: { label: string; percentage: number }[]
}

export function RoutingFlowDiagram({ destinations }: RoutingFlowDiagramProps) {
  return (
    <div className="glass rounded-lg p-6">
      <h3 className="text-xs font-heading font-medium text-on-surface-variant uppercase tracking-wider mb-6">
        Payment Flow
      </h3>
      <div className="flex flex-col items-center">
        <div className="w-16 h-16 rounded-xl bg-success/10 flex items-center justify-center">
          <DollarSign className="w-8 h-8 text-success" />
        </div>
        <p className="text-xs font-heading text-on-surface mt-2 mb-1">Incoming Payment</p>
        <p className="text-xs text-on-surface-variant mb-4">Customer sends USDC/SOL</p>

        <div className="w-px h-8 bg-gradient-to-b from-success/50 to-electric-purple/50" />
        <ArrowDown className="w-4 h-4 text-electric-purple -my-1" />

        <div className="glass rounded-lg p-4 w-full mt-2 mb-4">
          <p className="text-xs text-on-surface-variant text-center font-heading">
            Smart Contract Split
          </p>
        </div>

        <div className="w-px h-8 bg-gradient-to-b from-electric-purple/50 to-electric-teal/50" />
        <ArrowDown className="w-4 h-4 text-electric-teal -my-1" />

        <div className="w-full space-y-2 mt-2">
          {destinations.map((dest, i) => (
            <motion.div
              key={dest.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center justify-between p-3 rounded-lg"
              style={{ backgroundColor: `${colors[i % colors.length]}10` }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: colors[i % colors.length] }}
                />
                <span className="text-sm text-on-surface">{dest.label}</span>
              </div>
              <span className="text-sm font-heading text-on-surface">
                {dest.percentage}%
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
