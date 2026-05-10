import type { Locale } from "./config"

const en = {
  nav: {
    features: "Features",
    howItWorks: "How It Works",
    getStarted: "Get Started",
  },
  hero: {
    badge: "Now on Solana devnet",
    title1: "Accept Stablecoin",
    title2: "Payments in Minutes",
    subtitle:
      "LatamLink Pay helps small businesses accept USDC, USDT, and SOL with instant settlement and no technical setup.",
    cta1: "Start Selling",
    cta2: "Create POS",
    merchants: "merchants onboarded",
    livePayment: "Live Payment",
    dailyRevenue: "Daily Revenue",
    transactions: "Transactions",
    connected: "Connected",
  },
  howItWorks: {
    title: "How It Works",
    subtitle: "Get started in minutes. No coding, no complex setup.",
    steps: [
      {
        title: "Create Your Account",
        description: "Create your account in LatamLink Pay and start accepting payments.",
      },
      {
        title: "Generate Your POS",
        description: "Create a unique QR code that customers scan to pay instantly.",
      },
      {
        title: "Accept Payments",
        description: "Receive USDC, USDT, or SOL directly with instant settlement.",
      },
      {
        title: "Manage Your Treasury",
        description: "Auto-split revenue across wallets and track analytics.",
      },
    ],
  },
  features: {
    title: "Everything You Need",
    subtitle: "Built for real-world commerce, powered by Solana.",
    items: [
      {
        title: "Instant Payments",
        description: "Settle transactions in seconds with Solana's lightning-fast network.",
      },
      {
        title: "No-Code Onboarding",
        description: "Create your POS terminal without writing a single line of code.",
      },
      {
        title: "QR Payments",
        description: "Generate unique QR codes for each transaction. Scan and pay instantly.",
      },
      {
        title: "Treasury Automation",
        description: "Automatically manage your business treasury with smart routing.",
      },
      {
        title: "Automatic Revenue Split",
        description: "Distribute payments across multiple wallets in a single transaction.",
      },
      {
        title: "Merchant Analytics",
        description: "Track revenue, transaction history, and business performance.",
      },
    ],
  },
  cta: {
    title: "Ready to Start Accepting Crypto?",
    subtitle:
      "Join thousands of merchants already using LatamLink Pay to grow their business with stablecoin payments.",
    button: "Create Your POS Now",
    footnote: "No credit card required. 100% free to start.",
  },
  footer: {
    description:
      "Modern payment infrastructure for Latin American businesses. Accept stablecoins, grow your business.",
    product: "Product",
    resources: "Resources",
    rights: "All rights reserved.",
    builtOn: "Built on Solana",
    poweredBy: "Powered by LatamLink",
  },
}

const es: typeof en = {
  nav: {
    features: "Características",
    howItWorks: "Cómo Funciona",
    getStarted: "Comenzar",
  },
  hero: {
    badge: "Ahora en Solana devnet",
    title1: "Acepta Pagos con",
    title2: "Stablecoins en Minutos",
    subtitle:
      "LatamLink Pay ayuda a pequeños comercios a aceptar USDC, USDT y SOL con liquidación instantánea y sin configuración técnica.",
    cta1: "Empezar a Vender",
    cta2: "Crear POS",
    merchants: "comercios registrados",
    livePayment: "Pago en Vivo",
    dailyRevenue: "Ingresos del Día",
    transactions: "Transacciones",
    connected: "Conectado",
  },
  howItWorks: {
    title: "Cómo Funciona",
    subtitle: "Comienza en minutos. Sin código, sin configuración compleja.",
    steps: [
      {
        title: "Crea tu Cuenta",
        description: "Crea tu cuenta en LatamLink Pay y comienza a aceptar pagos.",
      },
      {
        title: "Genera tu POS",
        description: "Crea un código QR único que tus clientes escanean para pagar al instante.",
      },
      {
        title: "Acepta Pagos",
        description: "Recibe USDC, USDT o SOL directamente con liquidación instantánea.",
      },
      {
        title: "Administra tu Tesorería",
        description: "Distribuye ingresos automáticamente entre varias wallets y analiza métricas.",
      },
    ],
  },
  features: {
    title: "Todo lo que Necesitas",
    subtitle: "Construido para el comercio real, impulsado por Solana.",
    items: [
      {
        title: "Pagos Instantáneos",
        description: "Liquida transacciones en segundos con la red ultrarrápida de Solana.",
      },
      {
        title: "Registro Sin Código",
        description: "Crea tu terminal POS sin escribir una sola línea de código.",
      },
      {
        title: "Pagos con QR",
        description: "Genera códigos QR únicos para cada transacción. Escanea y paga al instante.",
      },
      {
        title: "Tesorería Automatizada",
        description: "Administra automáticamente tu tesorería empresarial con enrutamiento inteligente.",
      },
      {
        title: "División Automática de Ingresos",
        description: "Distribuye pagos entre múltiples wallets en una sola transacción.",
      },
      {
        title: "Analíticas de Comercio",
        description: "Monitorea ingresos, historial de transacciones y rendimiento del negocio.",
      },
    ],
  },
  cta: {
    title: "¿Listo para Aceptar Cripto?",
    subtitle:
      "Únete a miles de comercios que ya usan LatamLink Pay para hacer crecer su negocio con pagos en stablecoins.",
    button: "Crea tu POS Ahora",
    footnote: "Sin tarjeta de crédito. 100% gratis para empezar.",
  },
  footer: {
    description:
      "Infraestructura de pagos moderna para negocios latinoamericanos. Acepta stablecoins, haz crecer tu negocio.",
    product: "Producto",
    resources: "Recursos",
    rights: "Todos los derechos reservados.",
    builtOn: "Construido en Solana",
    poweredBy: "Impulsado por LatamLink",
  },
}

export const dictionaries: Record<Locale, typeof en> = { en, es }
