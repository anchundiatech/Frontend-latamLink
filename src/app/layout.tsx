import type { Metadata } from "next"
import { Fraunces, DM_Sans } from "next/font/google"

import { PrivyProvider } from "@/components/wallet/PrivyProvider"
import { LanguageProvider } from "@/lib/i18n/LanguageProvider"

import { Toaster } from "sonner"

import "./globals.css"

export const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-heading",
})

export const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
})

export const metadata: Metadata = {
  title: "LatamLink Pay — Accept Stablecoin Payments in Minutes",
  description:
    "LatamLink Pay helps small businesses accept USDC, USDT, and SOL with instant settlement and no technical setup.",

  icons: {
    icon: "/favicon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fraunces.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-text-primary font-body">

        <PrivyProvider>

          <LanguageProvider>

            {children}

          </LanguageProvider>

          <Toaster
            position="bottom-right"
            richColors
            toastOptions={{
              className:
                "bg-surface border border-border text-text-primary backdrop-blur-xl",
            }}
          />

        </PrivyProvider>

      </body>
    </html>
  )
}