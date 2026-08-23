"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import Image from "next/image";
import Link from "next/link";
import { Moon, Sun, Languages, Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { getTheme, toggleTheme } from "@/lib/theme";

const navLinks = [
  { href: "#como-funciona", labelKey: "howitworks" as const },
  { href: "#beneficios", labelKey: "benefits" as const },
  // { href: "#nosotros", labelKey: "Aboutus" as const }, — vuelve junto con TeamSection
];

export default function HeaderLanding() {
  const { t, locale, setLocale } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsDark(getTheme() === "dark");
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  const handleToggleTheme = () => {
    const next = toggleTheme();
    setIsDark(next === "dark");
  };

  const toggleLanguage = () => {
    setLocale(locale === "es" ? "en" : "es");
  };

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-100 h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between bg-background/80 backdrop-blur-md border-b border-border">
      {/* LOGO */}

      <div className="flex items-center gap-3 shrink-0 min-w-0">
        <Link
          href="/"
          className="flex items-center gap-2 no-underline shrink-0"
          onClick={closeMenu}
        >
          <Image
            src="/Logo.webp"
            alt="LATAMLink"
            width={40}
            height={40}
            className="size-8 sm:size-10 object-contain"
          />

          <h1 className="font-heading text-xl sm:text-2xl font-semibold tracking-tight text-text-primary leading-none">
            LatamLink <span className="text-primary">Pay</span>
          </h1>
        </Link>

        <div className="hidden sm:inline-flex items-center gap-2 bg-white dark:bg-surface border border-border rounded-full px-3 py-1.5 text-xs text-text-secondary">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          {t.hero.live}
        </div>
      </div>

      {/* NAV — desktop */}
      <nav className="hidden lg:block">
        <ul className="flex items-center gap-8 list-none">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-[14px] text-text-secondary font-normal transition-colors duration-200 hover:text-text-primary"
              >
                {t.nav[link.labelKey]}
              </a>
            </li>
          ))}

          {/* LANGUAGE BUTTON */}
          <li>
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-surface hover:bg-surface-bright transition-all duration-200 cursor-pointer"
            >
              <Languages size={16} />
              <span className="text-sm font-medium uppercase">{locale}</span>
            </button>
          </li>

          {/* DARK MODE BUTTON */}
          <li>
            <button
              onClick={handleToggleTheme}
              className="p-2 rounded-lg hover:bg-surface transition-colors cursor-pointer"
            >
              {mounted && (isDark ? <Sun size={18} /> : <Moon size={18} />)}
            </button>
          </li>

          {/* CTA */}
          <li>
            <a
              href="#contacto"
              className="bg-primary text-white px-5 py-2 rounded-lg text-[14px] font-medium transition-all duration-200 hover:opacity-90 hover:scale-[1.02] inline-block"
            >
              {t.nav.Getstarted}
            </a>
          </li>
        </ul>
      </nav>

      {/* NAV — mobile trigger */}
      <div className="flex items-center gap-1 lg:hidden">
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-border bg-surface hover:bg-surface-bright transition-all duration-200 cursor-pointer"
          aria-label="Toggle language"
        >
          <Languages size={16} />
          <span className="text-xs font-medium uppercase">{locale}</span>
        </button>
        <button
          onClick={handleToggleTheme}
          className="p-2 rounded-lg hover:bg-surface transition-colors cursor-pointer"
          aria-label="Toggle theme"
        >
          {mounted && (isDark ? <Sun size={18} /> : <Moon size={18} />)}
        </button>
        <button
          onClick={() => setIsMenuOpen((open) => !open)}
          className="p-2 rounded-lg hover:bg-surface transition-colors cursor-pointer"
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* NAV — mobile drawer */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 top-16 bg-black/40 lg:hidden"
              onClick={closeMenu}
            />
            <motion.nav
              key="drawer"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="absolute top-16 left-0 right-0 bg-background border-b border-border shadow-xl lg:hidden"
            >
              <ul className="flex flex-col list-none px-4 py-4 gap-1">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      onClick={closeMenu}
                      className="block px-3 py-3 rounded-lg text-[15px] text-text-secondary font-normal transition-colors duration-200 hover:text-text-primary hover:bg-surface"
                    >
                      {t.nav[link.labelKey]}
                    </a>
                  </li>
                ))}
                <li className="pt-2">
                  <a
                    href="#contacto"
                    onClick={closeMenu}
                    className="block text-center bg-primary text-white px-5 py-3 rounded-lg text-[14px] font-medium transition-all duration-200 hover:opacity-90"
                  >
                    {t.nav.Getstarted}
                  </a>
                </li>
              </ul>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
