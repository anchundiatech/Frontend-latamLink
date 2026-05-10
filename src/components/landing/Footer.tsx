"use client"

import Link from "next/link"
import { Logo } from "@/components/Logo"
import { useLanguage } from "@/lib/i18n/LanguageProvider"

const productLinks = ["POS Terminal", "Dashboard", "Split Routing", "Analytics"]
const resourceLinks = ["Docs", "API", "Support", "Status"]

export function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="border-t border-white/5 py-12">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="grid sm:grid-cols-4 gap-8">
          <div className="sm:col-span-2">
            <div className="mb-4">
              <Logo size={50} />
            </div>
            <p className="text-xs text-on-surface-variant max-w-xs">
              {t.footer.description}
            </p>
          </div>
          <div>
            <h4 className="text-xs font-heading font-medium text-on-surface mb-4 uppercase tracking-wider">
              {t.footer.product}
            </h4>
            <ul className="space-y-2">
              {productLinks.map((item) => (
                <li key={item}>
                  <Link
                    href="/portal/pos"
                    className="text-xs text-on-surface-variant hover:text-on-surface transition-colors"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-heading font-medium text-on-surface mb-4 uppercase tracking-wider">
              {t.footer.resources}
            </h4>
            <ul className="space-y-2">
              {resourceLinks.map((item) => (
                <li key={item}>
                  <span className="text-xs text-on-surface-variant hover:text-on-surface transition-colors cursor-default">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-on-surface-variant">
            &copy; {new Date().getFullYear()} LatamLink Pay. {t.footer.rights}
          </p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-on-surface-variant">
              {t.footer.builtOn}
            </span>
            <span className="w-1 h-1 rounded-full bg-surface-container-highest" />
            <span className="text-xs text-on-surface-variant">
              {t.footer.poweredBy}
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
