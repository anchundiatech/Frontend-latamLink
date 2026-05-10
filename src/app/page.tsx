"use client"

import Link from "next/link"
import { Hero } from "@/components/landing/Hero"
import { HowItWorks } from "@/components/landing/HowItWorks"
import { Features } from "@/components/landing/Features"
import { CTASection } from "@/components/landing/CTASection"
import { Footer } from "@/components/landing/Footer"
import { Logo } from "@/components/Logo"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { useLanguage } from "@/lib/i18n/LanguageProvider"

export default function Home() {
  const { t } = useLanguage()
  return (
    <div className="flex flex-col flex-1">
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 h-14 flex items-center justify-between">
          <Logo size={36} />
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-xs text-on-surface-variant hover:text-on-surface transition-colors">
              {t.nav.features}
            </a>
            <a href="#how-it-works" className="text-xs text-on-surface-variant hover:text-on-surface transition-colors">
              {t.nav.howItWorks}
            </a>
          </nav>
          <LanguageSwitcher  />
          <Link
            href="/login"
            className="text-xs font-heading font-medium bg-electric-purple hover:bg-electric-purple/90 text-white px-4 py-2 rounded-default transition-all duration-200"
          >
            {t.nav.getStarted}
          </Link>
        </div>
      </header>
      <main className="flex-1 pt-14">
        <Hero />
        <div id="how-it-works">
          <HowItWorks />
        </div>
        <div id="features">
          <Features />
        </div>
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}
