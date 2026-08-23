"use client"

import Link from "next/link"
import { LayoutDashboard, Landmark, Store, X, LogOut, ArrowLeft } from "lucide-react"
import { Logo } from "@/components/Logo"

const navItems = [
  { href: "#overview", name: "Overview", icon: LayoutDashboard },
  { href: "#treasury", name: "Treasury", icon: Landmark },
  { href: "#merchants", name: "Merchants", icon: Store },
]

export function AdminSidebar({
  isOpen,
  onClose,
  onSignOut,
}: {
  isOpen: boolean
  onClose: () => void
  onSignOut: () => void
}) {
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 glass-strong border-r border-white/5 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Logo size={28} />
            <span className="text-sm font-heading text-on-surface">Admin</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="lg:hidden text-on-surface-variant hover:text-on-surface transition-colors p-2 -mr-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-default text-sm font-heading text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-all duration-200"
            >
              <item.icon className="w-4 h-4" />
              {item.name}
            </a>
          ))}
        </nav>

        <div className="p-3 border-t border-white/5 space-y-1">
          <Link
            href="/portal/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-default text-sm font-heading text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to portal
          </Link>
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-default text-sm font-heading text-on-surface-variant hover:text-error hover:bg-error/10 transition-all duration-200 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}
