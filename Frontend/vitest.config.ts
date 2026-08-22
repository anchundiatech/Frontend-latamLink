import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    // El relayer (backend/) es un servicio aparte y usa el runner nativo de
    // Node, no vitest: se corre con `pnpm --dir backend test`.
    exclude: ["**/node_modules/**", "**/dist/**", "backend/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
