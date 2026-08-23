import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite probar el dev server desde un túnel HTTPS (cloudflared/ngrok) con
  // una wallet real: sin esto, Next.js bloquea el hot-reload y algunos
  // recursos cuando el navegador llega por un origen distinto a localhost.
  allowedDevOrigins: ["*.trycloudflare.com"],
};

export default nextConfig;
