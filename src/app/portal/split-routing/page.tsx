"use client"

import { motion } from "framer-motion"
import { RoutingFlowDiagram } from "@/components/split-routing/RoutingFlowDiagram"
import { SplitRoutingConfig } from "@/components/split-routing/SplitRoutingConfig"
import { useMerchantStore } from "@/lib/store/useMerchantStore"


export default function SplitRoutingPage() {
  const { destinations } = useMerchantStore()

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
    
        <div>
          <h1 className="text-headline-lg font-heading text-on-surface">
            Split Routing
          </h1>
          <p className="text-xs text-on-surface-variant">
            Configure how payments are distributed across your accounts
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <SplitRoutingConfig />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <RoutingFlowDiagram
            destinations={destinations.map((d) => ({
              label: d.label,
              percentage: d.percentage,
            }))}
          />
        </motion.div>
      </div>
    </div>
  )
}
