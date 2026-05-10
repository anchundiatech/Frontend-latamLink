"use client"

import { motion } from "framer-motion"
import { ArrowRight, QrCode, Zap, TrendingUp, Clock } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/lib/i18n/LanguageProvider"

export function Hero() {
  const { t } = useLanguage()

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(168,85,247,0.12),transparent_50%),radial-gradient(ellipse_at_bottom_left,_rgba(45,212,191,0.08),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(221,183,255,0.03),transparent_50%)]" />
      <div className="relative max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-electric-teal animate-pulse" />
              <span className="text-on-surface-variant">{t.hero.badge}</span>
            </div>
            <h1 className="text-display-lg font-heading text-on-surface">
              {t.hero.title1}
              <br />
              <span className="text-gradient">{t.hero.title2}</span>
            </h1>
            <p className="text-body-lg text-on-surface-variant max-w-lg">
              {t.hero.subtitle}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 bg-electric-purple hover:bg-electric-purple/90 text-white font-heading font-medium px-6 py-3 rounded-default transition-all duration-200 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]"
              >
                {t.hero.cta1}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 glass glass-hover text-on-surface font-heading font-medium px-6 py-3 rounded-default transition-all duration-200"
              >
                {t.hero.cta2}
                <QrCode className="w-4 h-4" />
              </Link>
            </div>
            <div className="flex items-center gap-8 pt-4">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-surface-container-high border border-white/10 flex items-center justify-center text-xs font-heading"
                  >
                    {i}
                  </div>
                ))}
              </div>
              <p className="text-sm text-on-surface-variant">
                <span className="text-on-surface font-medium">1,200+</span>{" "}
                {t.hero.merchants}
              </p>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="hidden lg:flex justify-center"
          >
            <div className="glass-strong rounded-xl p-8 w-full max-w-md">
              {/* POS Terminal Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-electric-purple/20 flex items-center justify-center">
                    <QrCode className="w-5 h-5 text-electric-purple" />
                  </div>
                  <div>
                    <p className="text-sm font-heading text-on-surface">POS Terminal</p>
                    <p className="text-xs text-on-surface-variant">Ready to accept payments</p>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 text-xs text-success">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  Online
                </span>
              </div>

              {/* Amount Display */}
              <div className="text-center py-4 mb-4 bg-surface-container-highest/50 rounded-lg">
                <p className="text-xs text-on-surface-variant mb-1">{t.hero.livePayment}</p>
                <div className="text-4xl font-heading font-bold text-on-surface tracking-tight">
                  $45.00
                </div>
                <p className="text-xs text-on-surface-variant mt-2">Customer scans QR to pay</p>
              </div>

              {/* QR Code Placeholder */}
              <div className="flex justify-center mb-6">
                <div className="w-28 h-28 bg-white rounded-xl flex items-center justify-center shadow-lg">
                  <QrCode className="w-14 h-14 text-black/80" />
                </div>
              </div>

              {/* Sales Metrics */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-electric-teal" />
                  <span className="text-on-surface-variant">{t.hero.dailyRevenue}</span>
                  <span className="ml-auto font-heading text-on-surface">$1,234.56</span>
                </div>
                <div className="h-2 rounded-full bg-surface-container-highest overflow-hidden">
                  <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-electric-purple to-electric-teal" />
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-electric-teal" />
                  <span className="text-on-surface-variant">{t.hero.transactions}</span>
                  <span className="ml-auto font-heading text-on-surface">47 today</span>
                </div>
              </div>

              {/* Footer Status */}
              <div className="mt-6 pt-6 border-t border-white/5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-success" />
                </div>
                <div className="text-xs text-on-surface-variant">
                  <p className="text-on-surface font-heading">Instant Settlement</p>
                  <p>Funds available immediately</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
