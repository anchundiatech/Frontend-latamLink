/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/portal/Sidebar"
import { Menu, LogOut } from "lucide-react"
import { Logo } from "@/components/Logo"
import { usePrivy } from "@privy-io/react-auth"
import { useMerchantStore } from "@/lib/store/useMerchantStore"
import { useMerchantSync } from "@/lib/services/useMerchantSync"

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [checking, setChecking] = useState(true)
  const { name } = useMerchantStore()
  const { authenticated, user, logout: privyLogout } = usePrivy()
  const router = useRouter()
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
    <div className="min-h-screen flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 lg:pl-64">
        <header className="glass border-b border-white/5 h-14 flex items-center px-4 lg:px-8 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            className="lg:hidden text-on-surface-variant hover:text-on-surface mr-1 p-2 -ml-2"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="lg:hidden">
            <Logo size={32} />
          </div>
          <div className="ml-auto flex items-center gap-3">
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
              onClick={() => { privyLogout(); router.push("/") }}
              className="text-on-surface-variant hover:text-error transition-colors p-2 -mr-2"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
