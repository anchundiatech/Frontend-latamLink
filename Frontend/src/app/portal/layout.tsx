/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Sidebar } from "@/components/portal/Sidebar"
import { Menu, LogOut } from "lucide-react"
import { Logo } from "@/components/Logo"
import { usePrivy } from "@privy-io/react-auth"
import { useMerchantStore } from "@/lib/store/useMerchantStore"
import { useMerchantSync } from "@/lib/services/useMerchantSync"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"

const pageTitles: Record<string, { title: string; subtitle?: string }> = {
  "/portal/dashboard": { title: "Dashboard", subtitle: "Your business at a glance" },
  "/portal/pos": { title: "POS Terminal" },
  "/portal/split-routing": { title: "Split Routing", subtitle: "Configure how payments are distributed" },
  "/portal/transactions": { title: "Transactions", subtitle: "View all payment transactions" },
  "/portal/settings": { title: "Settings", subtitle: "Manage your merchant configuration" },
}

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [checking, setChecking] = useState(true)
  const [signOutOpen, setSignOutOpen] = useState(false)
  const { name } = useMerchantStore()
  const { authenticated, user, logout: privyLogout } = usePrivy()
  const router = useRouter()
  const pathname = usePathname()
  const page = pageTitles[pathname]
  const isPos = pathname === "/portal/pos"
  // Carga el comercio desde la base: es lo que permite entrar desde otro
  // dispositivo sin volver a darse de alta.
  const { loading: sincronizando, found: comercioEnLaBase } = useMerchantSync()

  useEffect(() => {
    if (!authenticated) {
      router.replace("/login")
      return
    }

    const { userId: storedUserId } = useMerchantStore.getState()
    const currentUserId = user?.id ?? ""

    if (storedUserId && storedUserId !== currentUserId) {
      useMerchantStore.getState().reset()
      router.replace("/onboarding")
      return
    }

    // No se decide nada hasta saber qué dice la base.
    if (sincronizando) return

    if (comercioEnLaBase === false) {
      router.replace("/onboarding")
      return
    }

    if (comercioEnLaBase === null) {
      // Sin respuesta de la base (wallet aún no lista o servicio caído):
      // se cae con gracia a lo que haya guardado el navegador.
      const { isActive, walletAddress } = useMerchantStore.getState()
      if (!isActive || !walletAddress) {
        router.replace("/onboarding")
        return
      }
    }

    setChecking(false)
  }, [authenticated, router, user, sincronizando, comercioEnLaBase])

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-electric-purple border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-dvh flex overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 lg:pl-64 h-full flex flex-col min-w-0">
        <header className="glass border-b border-white/5 min-h-14 flex items-center gap-3 px-4 lg:px-8 py-2 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            className="lg:hidden text-on-surface-variant hover:text-on-surface mr-1 p-2 -ml-2 shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="lg:hidden shrink-0">
            <Logo size={32} />
          </div>
          {page && (
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-heading font-semibold text-on-surface leading-tight truncate">
                {page.title}
              </h1>
              {page.subtitle && (
                <p className="hidden sm:block text-xs text-on-surface-variant leading-tight truncate">
                  {page.subtitle}
                </p>
              )}
            </div>
          )}
          <div className="ml-auto flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-2 text-right">
              <p className="text-xs font-heading text-on-surface">{name}</p>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-success/10">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                <span className="text-[10px] font-heading text-success">Active</span>
              </div>
            </div>
            <span className="hidden sm:block text-[10px] text-on-surface-variant/60 font-mono">
              {user?.email?.address ?? user?.google?.email ?? ""}
            </span>
            <button
              onClick={() => setSignOutOpen(true)}
              className="text-on-surface-variant hover:text-error transition-colors p-2 -mr-2 cursor-pointer"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        <ConfirmDialog
          open={signOutOpen}
          onOpenChange={setSignOutOpen}
          title="Sign out?"
          description="You'll need to sign in again to access your POS terminal and dashboard."
          confirmLabel="Sign out"
          onConfirm={() => {
            privyLogout()
            router.push("/")
          }}
        />

        <main
          className={
            isPos
              ? "flex-1 min-h-0 overflow-y-auto p-2 sm:p-4 flex flex-col"
              : "flex-1 min-h-0 overflow-y-auto p-4 lg:p-8"
          }
        >
          {children}
        </main>
      </div>
    </div>
  )
}
