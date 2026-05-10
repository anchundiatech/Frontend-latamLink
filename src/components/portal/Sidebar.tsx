"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  CreditCard,
  LayoutDashboard,
  GitBranch,
  ArrowLeftRight,
  Settings,
  X,
  Store,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Logo } from "@/components/Logo"
import { useMerchantStore } from "@/lib/store/useMerchantStore"

const navItems = [

  { name: "Dashboard", href: "/portal/dashboard", icon: LayoutDashboard },
  { name: "POS Terminal", href: "/portal/pos", icon: CreditCard },
  { name: "Split Routing", href: "/portal/split-routing", icon: GitBranch },
  { name: "Transactions", href: "/portal/transactions", icon: ArrowLeftRight },
  { name: "Settings", href: "/portal/settings", icon: Settings },
]

export function Sidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const pathname = usePathname()
  const { name } = useMerchantStore()

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 glass-strong border-r border-white/5 flex flex-col transition-transform duration-200 lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <Link href="/portal/pos" className="flex items-center gap-2" onClick={onClose}>
            <Logo size={28} />
            <span className="text-sm font-heading text-on-surface">LatamLink Pay</span>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-default text-sm font-heading transition-all duration-200",
                  isActive
                    ? "bg-electric-purple/10 text-electric-purple"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-white/5"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-electric-purple"
                  />
                )}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-white/5">
          <div className="glass rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <Store className="w-3.5 h-3.5 text-electric-teal" />
              <p className="text-xs font-heading text-on-surface truncate">{name}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              <span className="text-[10px] text-success font-heading">Active</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
