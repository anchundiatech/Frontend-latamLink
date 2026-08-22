import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // El relayer es un servicio Node aparte, con su propia configuración.
    "backend/**",
  ]),
  {
    rules: {
      // Queda como advertencia, no como error, mientras se revisa componente a
      // componente. Hoy marca siete casos que son el patrón habitual de
      // hidratación en cliente: leer localStorage o resolver la sesión después
      // del montaje, cosas que en SSR no se pueden hacer durante el render.
      // Arreglarlas de verdad implica reescribirlas con useSyncExternalStore (o
      // estado inicial perezoso) y comprobar que no se rompa la hidratación ni
      // el guard de rutas del portal: es un trabajo aparte, no de este cambio.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
