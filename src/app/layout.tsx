import type { Metadata } from "next"
import { Geist, Geist_Mono, Inter } from "next/font/google"
import { PrivyProvider } from "@/components/wallet/PrivyProvider"
import { LanguageProvider } from "@/lib/i18n/LanguageProvider"
import { Toaster } from "sonner"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "LatamLink Pay — Accept Stablecoin Payments in Minutes",
  description:
    "LatamLink Pay helps small businesses accept USDC, USDT, and SOL with instant settlement and no technical setup.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PrivyProvider>
          <LanguageProvider>
            {children}
          </LanguageProvider>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "rgba(19, 27, 46, 0.9)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                color: "#dae2fd",
              },
            }}
          />
        </PrivyProvider>
      </body>
    </html>
  )
}
