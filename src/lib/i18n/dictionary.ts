import type { Locale } from "./config"

const en = {
  nav: {
    howitworks: "How it works",
    benefits: "Benefits",
    Aboutus: "About us",
    Getstarted: "Get early access"
  },
  hero: {
    live: "Available on Devnet",
    badge: "Get paid in dollars",
    title1: "instantly",
    title2: "right from your register",
    subtitle:
      "Accept digital payments in your store without a bank, without exorbitant fees, and without waiting days. Your money arrives in seconds.",
    cta1: "Get early access",
    cta2: "How It Works",
    merchants: "Store Fernández",
    merchantslogo: "SF",
    livePayment: "Payment Received",
    dailyRevenue: "Today's Sales",
    transactions: "Transactions",
    connected: "Connected",
  },
  stats: {
    commission: "commission banks and processors charge",
    settlement: "your payment arrives in",
    buy: "you need to buy",
  },
  socialProof: {
    label: "Backed by",
    accelerator: "Dev3Pack Accelerator",
    incubator: "Waylearn x Solana Foundation",
    stack: "Powered by",
    techs: ["Solana", "USDC", "Circle"],
  },
  manifesto: {
    badge: "Our belief",
    title: "We believe no merchant should lose 7% of their sale or wait 3 days for their own money.",
    body: "We refuse to accept a Latin America where access to dollars is a privilege, not a right. We are building the payment infrastructure that merchants in our countries deserve — not the one that big banks want them to have.",
  },
  howItWorks: {
    title: "How It Works",
    subtitle: "As easy as collecting cash",
    description: "No technical knowledge required.",
    steps: [
      {
        title: "Create Your Account",
        description: "Sign up with your email and create your profile in seconds.",
      },
      {
        title: "Show the QR",
        description: "Generate a QR code from your phone or tablet on each sale. Your client scans and pays.",
      },
      {
        title: "The money arrives",
        description: "In less than 3 seconds the payment is automatically distributed according to your rules.",
      },
    ],
  },
  features: {
    eyebrow: "Why LatamLink Pay",
    title: "Designed for the real merchant",
    items: [
      {
        title: "Stable dollar collections",
        description: "You receive USDC — a digital dollar that is always worth exactly $1. Without the volatility of other cryptocurrencies.",
      },
      {
        title: "Instant settlement",
        description: "No waiting 3 business days. The money is available in seconds, not days.",
      },
      {
        title: "Automatic distribution",
        description: "You define once how to distribute each payment and the system does it on its own. Payment to suppliers, savings, and cash register without lifting a finger.",
      },
      {
        title: "No exorbitant fees",
        description: "You pay less than 0.5% per transaction. The network fee is automatically deducted from the payment — you don't pay anything extra.",
      },
    ],
  },
  compare: {
    title: "The difference",
    subtitle: "Compare with what you are using today",
    headers: ["Bank / processor", "LatamLink Pay"],
    features: [
      { name: "Collection commission", them: "3–7%", us: "< 0.5%", status: "bad" },
      { name: "Settlement time", them: "1–3 business days", us: "< 3 seconds", status: "good" },
      { name: "Distribution of funds", them: "Manual", us: "Automatic", status: "good" },
      { name: "Access to dollars", them: "Restricted", us: "From the first collection", status: "good" },
      { name: "Requires bank account", them: "Yes", us: "No", status: "good" },
    ]
  },
  countries: {
    badge: "Our market",
    title: "Built by and for LatAm merchants",
    subtitle: "We are three founders who experienced this problem firsthand in our countries.",
    cta: "Get early access",
    list: [
      { name: "Ecuador", flag: "🇪🇨" },
      { name: "Bolivia", flag: "🇧🇴" },
      { name: "Mexico", flag: "🇲🇽" },
    ]
  },
  team: {
    badge: "The team",
    title: "Three countries, one problem, one solution",
    members: [
      { name: "Alejandro Anchundia", role: "CEO & Product", location: "🇪🇨 Orellana", initials: "CA", bio: "Fintech builder. Previously built payment solutions processing +$2M in LatAm.", linkedin: "https://www.linkedin.com/in/carlos-anchundia-4a3a5a1b6/" },
      { name: "Wilian Yucra", role: "Tech Lead", location: "🇧🇴 La Paz", initials: "WY", bio: "Full-stack & Solana developer, built blockchain-based payment rails.", linkedin: "#" },
      { name: "Diego López", role: "Backend Developer ", location: "🇲🇽 Ciudad de México", initials: "DL", bio: ".", linkedin: "#" },
    ]
  },
  cta: {
    title: "Ready to collect better?",
    subtitle: "Leave your email and we'll notify you when LatamLink Pay arrives in your city.",
    placeholder: "your@email.com",
    button: "I want early access",
    success: "Ready! We'll notify you soon 🎉"
  },
  footer: {
    description:
      "Modern payment infrastructure for Latin American businesses. Accept digital payments, grow your business.",
    product: "Product",
    resources: "Resources",
    rights: "All rights reserved.",
    builtOn: "Secure Network",
    poweredBy: "Powered by LatamLink",
    hackathonNote: "© 2026 LatamLink Pay. Built for the future of payments in Latam.",
  },
  welcome: {
    title: "Welcome to LatamLink Pay",
    subtitle: "Sign in to start accepting payments"
  },
  comingSoon: {
    title: "Coming soon",
    subtitle: "We're putting the finishing touches on LatamLink Pay. Leave your email and we'll let you know the moment it's ready.",
    ctaPlaceholder: "your@email.com",
    ctaButton: "Notify me",
    ctaSuccess: "Ready! We'll notify you soon 🎉",
    landingLink: "Back to home",
    footerNote: "© 2026 LatamLink Pay. All rights reserved.",
  },
}

const es: typeof en = {
  nav: {
    howitworks: "Cómo funciona",
    benefits: "Beneficios",
    Aboutus: "Nosotros",
    Getstarted: "Únete a la lista"
  },
  hero: {
    live: "Disponible en Devnet",
    badge: "Cobra en dólares",
    title1: "al instante",
    title2: "desde tu caja.",
    subtitle:
      "Acepta pagos digitales en tu tienda sin banco, sin comisiones abusivas y sin esperar días. Tu plata llega en segundos.",
    cta1: "Únete a la lista",
    cta2: "Ver cómo funciona",
    merchants: "Tienda Fernández",
    merchantslogo: "TF",
    livePayment: "Pago recibido en USDC",
    dailyRevenue: "Ventas de Hoy",
    transactions: "Transacciones",
    connected: "Conectado",
  },
  stats: {
    commission: "de comisión cobran bancos y procesadoras",
    settlement: "tarda tu pago en llegar",
    buy: "necesitas comprar",
  },
  socialProof: {
    label: "Respaldados por",
    accelerator: "Aceleradora Dev3Pack",
    incubator: "Waylearn x Solana Foundation",
    stack: "Tecnología",
    techs: ["Solana", "USDC", "Circle"],
  },
  manifesto: {
    badge: "Nuestra creencia",
    title: "Creemos que ningún comerciante debería perder el 7% de su venta ni esperar 3 días por su propio dinero.",
    body: "Nos negamos a aceptar un Latinoamérica donde acceder al dólar sea un privilegio y no un derecho. Estamos construyendo la infraestructura de pagos que los comerciantes de nuestros países merecen — no la que los grandes bancos quieren que tengan.",
  },
  howItWorks: {
    title: "Cómo funciona",
    subtitle: "Tan fácil como cobrar en efectivo",
    description: "No necesitas saber de tecnología.",
    steps: [
      {
        title: "Registrás tu negocio",
        description: "En 5 minutos configurás tu perfil y definís cómo querés repartir tus cobros: caja, proveedores, ahorro.",
      },
      {
        title: "Mostrás el QR",
        description: "En cada venta generás un código QR desde tu celular o tableta. Tu cliente lo escanea y paga desde su app.",
      },
      {
        title: "El dinero llega solo",
        description: "En menos de 3 segundos el pago se distribuye automáticamente según tus reglas. Sin esperar, sin banco intermediario.",
      },
    ],
  },
  features: {
    eyebrow: "Por qué LatamLink Pay",
    title: "Diseñado para el comerciante real",
    items: [
      {
        title: "Cobros en dólares estables",
        description: "Recibís USDC — un dólar digital que vale exactamente $1 siempre. Sin la volatilidad de otras criptomonedas.",
      },
      {
        title: "Liquidación al instante",
        description: "Nada de esperar 3 días hábiles. El dinero está disponible en segundos, no en días.",
      },
      {
        title: "Distribución automática",
        description: "Definís una vez cómo repartir cada cobro y el sistema lo hace solo. Pago a proveedores, ahorro y caja sin mover un dedo.",
      },
      {
        title: "Sin comisiones abusivas",
        description: "Pagás menos del 0.5% por transacción. La tarifa de red se descuenta sola del pago — vos no pagás nada extra.",
      },
    ],
  },
  compare: {
    title: "La diferencia",
    subtitle: "Compará con lo que estás usando hoy",
    headers: ["Banco / procesadora", "LatamLink Pay"],
    features: [
      { name: "Comisión por cobro", them: "3–7%", us: "< 0.5%", status: "bad" },
      { name: "Tiempo de liquidación", them: "1–3 días hábiles", us: "< 3 segundos", status: "good" },
      { name: "Distribución de fondos", them: "Manual", us: "Automática", status: "good" },
      { name: "Acceso al dólar", them: "Restringido", us: "Desde el primer cobro", status: "good" },
      { name: "Requiere cuenta bancaria", them: "Sí", us: "No", status: "good" },
    ]
  },
  countries: {
    badge: "Nuestro mercado",
    title: "Construido por y para comerciantes de LatAm",
    subtitle: "Somos tres fundadores que vivimos este problema de primera mano en nuestros países.",
    cta: "Únete a la lista",
    list: [
      { name: "Ecuador", flag: "🇪🇨" },
      { name: "Bolivia", flag: "🇧🇴" },
      { name: "México", flag: "🇲🇽" },
    ]
  },
  team: {
    badge: "El equipo",
    title: "Tres países, un problema, una solución",
    members: [
      { name: "Alejandro Anchundia", role: "CEO & Producto", location: "🇪🇨 Orellana", initials: "CA", bio: "Fintech builder. Construyó soluciones de pago procesando +$2M en LatAm.", linkedin: "https://www.linkedin.com/in/carlos-anchundia-4a3a5a1b6/" },
      { name: "Wilian Yucra", role: "Tech Lead", location: "🇧🇴 La Paz", initials: "WY", bio: "Full-stack & Solana developer, construyó sistemas de pago blockchain.", linkedin: "#" },
      { name: "Diego López", role: "Backend Developer ", location: "🇲🇽 Ciudad de México", initials: "DL", bio: "", linkedin: "#" },
    ]
  },
  cta: {
    title: "¿Listo para cobrar mejor?",
    subtitle: "Dejá tu correo y te avisamos cuando LatamLink Pay llegue a tu ciudad.",
    placeholder: "tu@correo.com",
    button: "Quiero acceso anticipado",
    success: "¡Listo! Te avisamos pronto 🎉"
  },
  footer: {
    description:
      "Infraestructura de pagos moderna para negocios latinoamericanos. Acepta pagos digitales, haz crecer tu negocio.",
    product: "Producto",
    resources: "Recursos",
    rights: "Todos los derechos reservados.",
    builtOn: "Red Segura",
    poweredBy: "Impulsado por LatamLink",
    hackathonNote: "© 2026 LatamLink Pay. Construyendo el futuro de los pagos en Latam.",
  },
  welcome: {
    title: "Bienvenido a LatamLink Pay",
    subtitle: "Inicia sesión para comenzar a aceptar pagos"
  },
  comingSoon: {
    title: "Muy pronto",
    subtitle: "Estamos dando los últimos retoques a LatamLink Pay. Dejá tu correo y te avisamos apenas esté listo.",
    ctaPlaceholder: "tu@correo.com",
    ctaButton: "Avisarme",
    ctaSuccess: "¡Listo! Te avisamos pronto 🎉",
    landingLink: "Volver al inicio",
    footerNote: "© 2026 LatamLink Pay. Todos los derechos reservados.",
  },
}

export const dictionaries: Record<Locale, typeof en> = { en, es }
