import type { MetadataRoute } from "next"
import { config } from "@/lib/config"

// Next.js sirve esto en /manifest.webmanifest y lo enlaza automáticamente
// en el <head>; no hace falta un public/manifest.json ni un <link> manual.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: config.appName,
    short_name: "LatamLink",
    description: config.appDescription,
    start_url: "/portal/pos",
    display: "standalone",
    orientation: "any",
    background_color: "#0F111A",
    theme_color: "#0F111A",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  }
}
