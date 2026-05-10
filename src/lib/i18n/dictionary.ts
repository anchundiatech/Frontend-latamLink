import type { Locale } from "./config"

const en = {
  nav: {
    features: "Features",
    howItWorks: "How It Works",
    getStarted: "Get Started",
  },
  hero: {
    badge: "For Small Businesses in Latin America",
    title1: "Accept Payments.",
    title2: "No Bank Account Required.",
    subtitle:
      "LatamLink Pay lets you accept digital payments from customers instantly. No monthly fees, no technical setup, no bank needed.",
    cta1: "Create Your Free Account",
    cta2: "How It Works",
    merchants: "merchants onboarded",
    livePayment: "Payment Received",
    dailyRevenue: "Today's Sales",
    transactions: "Transactions",
    connected: "Connected",
  },
  howItWorks: {
    title: "How It Works",
    subtitle: "Get started in minutes. No coding, no complex setup.",
    steps: [
      {
        title: "Create Your Account",
        description: "Sign up with your email and create your business profile in seconds.",
      },
      {
        title: "Set Up Your POS",
        description: "Configure your payment terminal and set up your revenue split rules.",
      },
      {
        title: "Accept Payments",
        description: "Show the QR code to your customer. They scan and pay from their phone.",
      },
      {
        title: "Grow Your Business",
        description: "Track sales, manage your funds, and scale with confidence.",
      },
    ],
  },
  features: {
    title: "Everything You Need",
    subtitle: "Built for real-world commerce. Simple, fast, and secure.",
    items: [
      {
        title: "Instant Payments",
        description: "Funds arrive in seconds. No more waiting days for bank transfers.",
      },
      {
        title: "No-Code Onboarding",
        description: "Create your POS terminal without writing a single line of code.",
      },
      {
        title: "QR Code Payments",
        description: "Generate a unique QR code for each transaction. Your customer scans and pays instantly.",
      },
      {
        title: "Treasury Management",
        description: "Automatically organize your revenue across different accounts.",
      },
      {
        title: "Automatic Revenue Split",
        description: "Distribute payments across your team, suppliers, and savings automatically.",
      },
      {
        title: "Sales Analytics",
        description: "Track revenue, transaction history, and business performance in real time.",
      },
    ],
  },
  cta: {
    title: "Ready to Start Accepting Payments?",
    subtitle:
      "Join thousands of merchants already using LatamLink Pay to grow their business.",
    button: "Create Your POS Now",
    footnote: "No credit card required. 100% free to start.",
  },
  footer: {
    description:
      "Modern payment infrastructure for Latin American businesses. Accept digital payments, grow your business.",
    product: "Product",
    resources: "Resources",
    rights: "All rights reserved.",
    builtOn: "Secure Network",
    poweredBy: "Powered by LatamLink",
  },

  welcome: {
    title: "Welcome to LatamLink Pay",
    subtitle: "Sign in to start accepting payments"

  },
}

const es: typeof en = {
  nav: {
    features: "Características",
    howItWorks: "Cómo Funciona",
    getStarted: "Comenzar",
  },
  hero: {
    badge: "Para Pequeños Negocios en Latinoamérica",
    title1: "Acepta Pagos.",
    title2: "Sin Necesidad de Banco.",
    subtitle:
      "LatamLink Pay te permite aceptar pagos digitales de tus clientes al instante. Sin cuotas mensuales, sin configuración técnica, sin necesidad de banco.",
    cta1: "Crea tu Cuenta Gratis",
    cta2: "Cómo Funciona",
    merchants: "comercios registrados",
    livePayment: "Pago Recibido",
    dailyRevenue: "Ventas de Hoy",
    transactions: "Transacciones",
    connected: "Conectado",
  },
  howItWorks: {
    title: "Cómo Funciona",
    subtitle: "Comienza en minutos. Sin código, sin configuración compleja.",
    steps: [
      {
        title: "Crea tu Cuenta",
        description: "Regístrate con tu correo y crea tu perfil de negocio en segundos.",
      },
      {
        title: "Configura tu POS",
        description: "Configura tu terminal de pago y establece las reglas de división de ingresos.",
      },
      {
        title: "Acepta Pagos",
        description: "Muestra el código QR a tu cliente. Ellos escanean y pagan desde su teléfono.",
      },
      {
        title: "Haz Crecer tu Negocio",
        description: "Monitorea ventas, administra tus fondos y escala con confianza.",
      },
    ],
  },
  features: {
    title: "Todo lo que Necesitas",
    subtitle: "Construido para el comercio real. Simple, rápido y seguro.",
    items: [
      {
        title: "Pagos Instantáneos",
        description: "Los fondos llegan en segundos. Sin esperar días por transferencias bancarias.",
      },
      {
        title: "Registro Sin Código",
        description: "Crea tu terminal POS sin escribir una sola línea de código.",
      },
      {
        title: "Pagos con Código QR",
        description: "Genera un código QR único para cada transacción. Tu cliente escanea y paga al instante.",
      },
      {
        title: "Gestión de Tesorería",
        description: "Organiza automáticamente tus ingresos en diferentes cuentas.",
      },
      {
        title: "División Automática de Ingresos",
        description: "Distribuye pagos entre tu equipo, proveedores y ahorros automáticamente.",
      },
      {
        title: "Analíticas de Ventas",
        description: "Monitorea ingresos, historial de transacciones y rendimiento en tiempo real.",
      },
    ],
  },
  cta: {
    title: "¿Listo para Aceptar Pagos?",
    subtitle:
      "Únete a miles de comercios que ya usan LatamLink Pay para hacer crecer su negocio.",
    button: "Crea tu POS Ahora",
    footnote: "Sin tarjeta de crédito. 100% gratis para empezar.",
  },
  footer: {
    description:
      "Infraestructura de pagos moderna para negocios latinoamericanos. Acepta pagos digitales, haz crecer tu negocio.",
    product: "Producto",
    resources: "Recursos",
    rights: "Todos los derechos reservados.",
    builtOn: "Red Segura",
    poweredBy: "Impulsado por LatamLink",
  },
  welcome: {
    title: "Bienvenido a LatamLink Pay",
    subtitle: "Inicia sesión para comenzar a aceptar pagos"
  },
}

export const dictionaries: Record<Locale, typeof en> = { en, es }
