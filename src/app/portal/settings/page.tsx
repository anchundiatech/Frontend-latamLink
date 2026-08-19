"use client"

import { motion } from "framer-motion"
import { Save } from "lucide-react"
import { toast } from "sonner"
import { WalletSettings } from "@/components/settings/WalletSettings"
import { RetiroSettings } from "@/components/settings/RetiroSettings"
import { TokenSettings } from "@/components/settings/TokenSettings"
import { FeeSettings } from "@/components/settings/FeeSettings"
import { TreasurySettings } from "@/components/settings/TreasurySettings"
import { TerminalSettings } from "@/components/settings/TerminalSettings"
import { Logo } from "@/components/Logo"

export default function SettingsPage() {
  const handleSave = () => {
    toast.success("Settings saved successfully!")
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
       
        <div>
          <h1 className="text-headline-lg font-heading text-on-surface">
            Settings
          </h1>
          <p className="text-xs text-on-surface-variant">
            Manage your merchant configuration
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <WalletSettings />
          <RetiroSettings />
          <TokenSettings />
          <FeeSettings />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="space-y-4"
        >
          <TerminalSettings />
          <TreasurySettings />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mt-6"
      >
        <button
          onClick={handleSave}
          className="w-full bg-electric-purple hover:bg-electric-purple/90 text-white font-heading font-medium py-3 rounded-default transition-all duration-200 text-sm flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          Save All Settings
        </button>
      </motion.div>
    </div>
  )
}
