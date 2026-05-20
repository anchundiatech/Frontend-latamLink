"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import Image from "next/image";
import Link from "next/link";
import { Moon, Sun, Languages } from "lucide-react";
import { useEffect, useState } from "react";

export default function HeaderLanding() {
  const { t, locale, setLocale } = useLanguage();
  const [mounted, setMounted] = useState(false);

  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;

    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      return savedTheme === "dark";
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    setMounted(true);

    const savedTheme = localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    if (savedTheme === "dark" || (!savedTheme && systemPrefersDark)) {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    } else {
      document.documentElement.classList.remove("dark");
      setIsDark(false);
    }
  }, []);

  const toggleTheme = () => {
    const html = document.documentElement;

    html.classList.toggle("dark");

    const isDarkMode = html.classList.contains("dark");

    localStorage.setItem("theme", isDarkMode ? "dark" : "light");

    setIsDark(isDarkMode);
  };

  const toggleLanguage = () => {
    setLocale(locale === "es" ? "en" : "es");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-100 h-15 px-8 flex items-center justify-between bg-background/80 backdrop-blur-md border-b border-border mb:p-1">
      {/* LOGO */}

      <Link href="/" className="flex items-center gap-2 no-underline">
        <Image
          src="/Logo.webp"
          alt="LATAMLink"
          width={40}
          height={40}
          className="size-10 object-contain"
        />

        <h1 className="font-heading text-2xl font-semibold tracking-tight text-text-primary leading-none">
          LatamLink <span className="text-primary">Pay</span>
        </h1>
      </Link>

      {/* NAV */}
      <nav>
        <ul className="flex items-center gap-8 list-none">
          <li>
            <a
              href="#como-funciona"
              className="text-[14px] text-text-secondary font-normal transition-colors duration-200 hover:text-text-primary"
            >
              {t.nav.howitworks}
            </a>
          </li>

          <li>
            <a
              href="#beneficios"
              className="text-[14px] text-text-secondary font-normal transition-colors duration-200 hover:text-text-primary"
            >
              {t.nav.benefits}
            </a>
          </li>

          <li>
            <a
              href="#nosotros"
              className="text-[14px] text-text-secondary font-normal transition-colors duration-200 hover:text-text-primary"
            >
              {t.nav.Aboutus}
            </a>
          </li>

          {/* LANGUAGE BUTTON */}
          <li>
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-surface hover:bg-surface-bright transition-all duration-200"
            >
              <Languages size={16} />
              <span className="text-sm font-medium uppercase">{locale}</span>
            </button>
          </li>

          {/* DARK MODE BUTTON */}
          <li>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-surface transition-colors"
            >
              {mounted && (isDark ? <Sun size={18} /> : <Moon size={18} />)}
            </button>
          </li>

          {/* CTA */}
          <li>
            <Link
              href="/login"
              className="bg-primary text-background px-5 py-2 rounded-lg text-[14px] font-medium transition-all duration-200 hover:opacity-90 hover:scale-[1.02]"
            >
              {t.nav.Getstarted}
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
