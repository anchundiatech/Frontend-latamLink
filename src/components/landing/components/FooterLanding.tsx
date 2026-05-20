"use client"

import { useLanguage } from "@/lib/i18n/LanguageProvider"

export function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="bg-obsidian text-white py-8 px-8 border-t border-white/5">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="font-heading text-lg font-semibold tracking-tight">
          LatamLink <span className="text-primary">Pay</span>
        </div>
        
        <div className="flex gap-6">
          <a
            href="https://x.com/LatamLinkpay"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#988d9f] hover:text-white transition-colors"
          >
            Twitter / X
          </a>
          <a
            href="https://www.linkedin.com/company/latamlink-pay"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#988d9f] hover:text-white transition-colors"
          >
            LinkedIn
          </a>
          <a
            href="https://github.com/anchundiatech/Frontend-latamLinkhttps://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#988d9f] hover:text-white transition-colors"
          >
            GitHub
          </a>
        </div>

        <div className="text-xs text-[#988d9f]">
          {t.footer.hackathonNote}
        </div>
      </div>
    </footer>
  )
}
