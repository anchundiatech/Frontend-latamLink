"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export default function HeroSection() {
  const { t, locale } = useLanguage();
  const [posState, setPosState] = useState<"idle" | "generating" | "success">(
    "idle",
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "15%"]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.05]);

  useEffect(() => {
    if (posState === "generating") {
      const timer = setTimeout(() => {
        setPosState("success");
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [posState]);

  return (
    <section className="relative min-h-screen overflow-hidden px-8 pt-1.5 pb-16 flex items-center justify-center bg-background">
      {/* Background */}
      <div ref={containerRef} className="absolute inset-0 overflow-hidden">
        <motion.div
          style={{ y, scale }}
          className="absolute inset-0 w-full h-full"
        >
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover opacity-10 dark:opacity-[0.15]"
          >
            <source src="/video/logo_animate.mp4" type="video/mp4" />
          </video>
        </motion.div>
        <div className="absolute inset-0 bg-background/40" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_30%_10%,rgba(153,69,255,0.14)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_80%_20%,rgba(0,194,255,0.08)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_60%_at_20%_80%,rgba(20,241,149,0.05)_0%,transparent_60%)]" />
        {/* Smooth bottom gradient to blend the video and cover the bottom portion completely */}
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-linear-to-t from-background via-background/95 to-transparent z-1" />
      </div>

      {/* Grid */}
      <div className="absolute inset-0 opacity-[0.04] bg-[linear-gradient(var(--color-text-primary)_1px,transparent_1px),linear-gradient(90deg,var(--color-text-primary)_1px,transparent_1px)] bg-size-[40px_40px]" />

      <div className="relative z-10 max-w-7xl w-full grid lg:grid-cols-2 gap-16 items-center">
        {/* LEFT */}
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <h1 className="font-heading text-6xl lg:text-8xl leading-[0.92] tracking-[-0.045em] text-text-primary mb-6">
            {t.hero.badge}
            <br />
            <span className="italic font-light opacity-80">
              {t.hero.title1}
            </span>
            <br />
            {t.hero.title2}
          </h1>

          <p className="text-body-lg text-text-secondary max-w-xl leading-relaxed mb-8">
            {t.hero.subtitle}
          </p>

          <div className="flex flex-wrap justify-center lg:justify-start gap-4">
            <button
              onClick={() =>
                document
                  .getElementById("contacto")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="bg-obsidian dark:bg-surface-bright dark:hover:bg-surface-bright/80 text-white dark:text-text-primary px-7 py-4 rounded-xl font-medium hover:opacity-90 transition-all cursor-pointer"
            >
              {t.hero.cta1}
            </button>

            <button
              onClick={() =>
                document
                  .getElementById("como-funciona")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="border border-border bg-white dark:bg-surface px-7 py-4 rounded-xl hover:border-text-secondary transition-all cursor-pointer text-text-primary"
            >
              {t.hero.cta2}
            </button>
          </div>
        </div>

        {/* RIGHT (POS Terminal Mockup) */}
        <div className="hidden lg:flex justify-center">
          <div className="bg-obsidian rounded-3xl p-8 w-[320px] shadow-2xl border border-white/10 relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-linear-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
                {t.hero.merchantslogo}
              </div>
              <div>
                <div className="text-white text-sm font-medium">
                  {t.hero.merchants}
                </div>
                <div className="text-text-secondary text-xs">
                  Quito, Ecuador
                </div>
              </div>
            </div>

            {/* Total to collect */}
            <div className="text-xs uppercase tracking-wider text-text-secondary mb-1">
              {locale === "es" ? "Total a cobrar" : "Total to collect"}
            </div>
            <div className="font-heading text-5xl text-white tracking-tight mb-1">
              $24.50
            </div>

            {/* Dynamic Status Text */}
            {posState === "idle" && (
              <div className="text-text-secondary text-sm mb-6 flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                {locale === "es" ? "Esperando pago" : "Waiting for payment"}
              </div>
            )}

            {posState === "generating" && (
              <div className="text-primary text-sm mb-6 flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                {locale === "es" ? "Escanea para pagar" : "Scan to pay"}
              </div>
            )}

            {posState === "success" && (
              <div className="text-success text-sm mb-6 flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-success animate-ping" />
                {t.hero.livePayment}
              </div>
            )}

            {/* Dynamic Card Body */}
            {posState === "generating" ? (
              <div className="relative w-35 h-35 mx-auto mb-6 bg-white p-2 rounded-xl border border-white/10 flex items-center justify-center">
                {/* Scanner Laser effect */}
                <div
                  className="absolute left-0 right-0 h-0.5 bg-primary shadow-md shadow-primary/80 animate-bounce"
                  style={{ animationDuration: "2s" }}
                />

                {/* QR Code SVG */}
                <svg width="120" height="120" viewBox="0 0 100 100">
                  <rect
                    x="5"
                    y="5"
                    width="25"
                    height="25"
                    fill="black"
                    stroke="black"
                    strokeWidth="2"
                  />
                  <rect x="10" y="10" width="15" height="15" fill="white" />
                  <rect x="13" y="13" width="9" height="9" fill="black" />

                  <rect
                    x="70"
                    y="5"
                    width="25"
                    height="25"
                    fill="black"
                    stroke="black"
                    strokeWidth="2"
                  />
                  <rect x="75" y="10" width="15" height="15" fill="white" />
                  <rect x="78" y="13" width="9" height="9" fill="black" />

                  <rect
                    x="5"
                    y="70"
                    width="25"
                    height="25"
                    fill="black"
                    stroke="black"
                    strokeWidth="2"
                  />
                  <rect x="10" y="75" width="15" height="15" fill="white" />
                  <rect x="13" y="78" width="9" height="9" fill="black" />

                  <rect x="75" y="75" width="10" height="10" fill="black" />
                  <rect x="77" y="77" width="6" height="6" fill="white" />
                  <rect x="79" y="79" width="2" height="2" fill="black" />

                  <path
                    d="M 35 5 h 5 v 5 h -5 z M 45 5 h 5 v 5 h -5 z M 55 5 h 5 v 5 h -5 z M 65 5 h 5 v 5 h -5 z M 35 15 h 5 v 5 h -5 z M 50 15 h 5 v 5 h -5 z M 60 15 h 5 v 5 h -5 z M 35 25 h 5 v 5 h -5 z M 45 25 h 5 v 5 h -5 z M 55 25 h 5 v 5 h -5 z M 5 35 h 5 v 5 h -5 z M 15 35 h 5 v 5 h -5 z M 25 35 h 5 v 5 h -5 z M 35 35 h 5 v 5 h -5 z M 45 35 h 5 v 5 h -5 z M 65 35 h 5 v 5 h -5 z M 75 35 h 5 v 5 h -5 z M 85 35 h 5 v 5 h -5 z M 10 45 h 5 v 5 h -5 z M 30 45 h 5 v 5 h -5 z M 50 45 h 5 v 5 h -5 z M 60 45 h 5 v 5 h -5 z M 80 45 h 5 v 5 h -5 z M 20 55 h 5 v 5 h -5 z M 40 55 h 5 v 5 h -5 z M 70 55 h 5 v 5 h -5 z M 90 55 h 5 v 5 h -5 z M 5 65 h 5 v 5 h -5 z M 35 65 h 5 v 5 h -5 z M 45 65 h 5 v 5 h -5 z M 55 65 h 5 v 5 h -5 z M 65 65 h 5 v 5 h -5 z M 85 65 h 5 v 5 h -5 z M 35 75 h 5 v 5 h -5 z M 45 75 h 5 v 5 h -5 z M 55 75 h 5 v 5 h -5 z M 65 75 h 5 v 5 h -5 z M 35 85 h 5 v 5 h -5 z M 45 85 h 5 v 5 h -5 z M 55 85 h 5 v 5 h -5 z M 65 85 h 5 v 5 h -5 z M 85 85 h 5 v 5 h -5 z"
                    fill="black"
                  />
                </svg>
              </div>
            ) : posState === "success" ? (
              <div className="flex flex-col items-center justify-center my-6 py-4 animate-scale-in">
                <div className="w-20 h-20 rounded-full bg-success/20 border-2 border-success flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                  <svg
                    className="w-10 h-10 text-success"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div className="mt-4 text-success font-semibold text-base tracking-wide">
                  {locale === "es"
                    ? "¡Transacción exitosa!"
                    : "Transaction Successful!"}
                </div>
              </div>
            ) : (
              <div className="my-6 p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-text-secondary leading-relaxed">
                {locale === "es"
                  ? "Genera un código QR único para tu cliente en cada venta. Cobros inmediatos sin intermediarios y directo a tu cuenta."
                  : "Generate a unique QR code for your client on every sale. Immediate payments without intermediaries and directly to your account."}
              </div>
            )}

            {/* Dynamic Action Button */}
            {posState === "idle" && (
              <button
                onClick={() => setPosState("generating")}
                className="w-full bg-primary text-obsidian py-3 rounded-xl font-semibold hover:opacity-90 transition-all cursor-pointer"
              >
                {locale === "es" ? "Generar código QR" : "Generate QR Code"}
              </button>
            )}

            {posState === "generating" && (
              <button
                disabled
                className="w-full bg-white/10 text-text-secondary py-3 rounded-xl font-semibold opacity-70 cursor-not-allowed flex items-center justify-center gap-2"
              >
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                {locale === "es"
                  ? "Esperando confirmación..."
                  : "Awaiting confirmation..."}
              </button>
            )}

            {posState === "success" && (
              <button
                onClick={() => setPosState("idle")}
                className="w-full bg-white text-obsidian py-3 rounded-xl font-semibold hover:bg-white/90 transition-all cursor-pointer"
              >
                {locale === "es" ? "Nueva venta" : "New Sale"}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
