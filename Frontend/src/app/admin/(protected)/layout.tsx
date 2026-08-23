/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { usePrivy } from "@privy-io/react-auth"
import { ShieldCheck, Menu } from "lucide-react"
import { AdminSidebar } from "@/components/admin/AdminSidebar"
import { Logo } from "@/components/Logo"
import { config } from "@/lib/config"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"

const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

// Gate independiente del portal de comercios: vive en su propia rama de
// rutas (admin/login queda afuera de este grupo) así un rechazo acá nunca
// termina en /onboarding, que es un mensaje que solo tiene sentido para
// comercios.
export default function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { ready, authenticated, user, logout } = usePrivy()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [signOutOpen, setSignOutOpen] = useState(false)

  const email = (user?.email?.address ?? user?.google?.email ?? "").toLowerCase()
  const isAdmin = ready && authenticated && adminEmails.includes(email)

  useEffect(() => {
    if (!ready) return
    if (!authenticated) {
      router.replace("/admin/login")
      return
    }
    if (!adminEmails.includes(email)) {
      console.warn(
        `[admin] Access denied. Session email: "${email}" — allowlist: [${adminEmails.join(", ")}]`
      )
      // Send rejected users to the landing page — routing them into the
      // portal would bounce non-merchants onward to /onboarding, which reads
      // as "you must register as a merchant to see admin".
      router.replace("/")
    }
  }, [ready, authenticated, email, router])

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-electric-purple border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-dvh flex overflow-hidden bg-background">
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSignOut={() => setSignOutOpen(true)}
      />

      <ConfirmDialog
        open={signOutOpen}
        onOpenChange={setSignOutOpen}
        title="Sign out?"
        description="You'll need to sign in again to access the admin dashboard."
        confirmLabel="Sign out"
        onConfirm={() => {
          logout()
          router.push("/")
        }}
      />
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
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-heading font-semibold text-on-surface leading-tight truncate flex items-center gap-1.5">
              Platform Admin
              <ShieldCheck className="w-4 h-4 text-electric-teal shrink-0" />
            </h1>
            <p className="hidden sm:block text-xs text-on-surface-variant leading-tight truncate">
              Internal dashboard · {config.cluster}
            </p>
          </div>
        </header>
        <main className="flex-1 min-h-0 overflow-y-auto p-4 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
