import path from "node:path"

import { cloudflare } from "@cloudflare/vite-plugin"
import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  server: {
    host: "127.0.0.1",
    port: 43123,
  },
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: "./src/frontend/routes",
      generatedRouteTree: "./src/frontend/route-tree.gen.ts",
    }),
    react(),
    cloudflare(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src/frontend"),
      "@backend": path.resolve(import.meta.dirname, "./src/backend"),
      "@frontend": path.resolve(import.meta.dirname, "./src/frontend"),
      "@lib": path.resolve(import.meta.dirname, "./src/frontend/lib"),
      "@features": path.resolve(import.meta.dirname, "./src/frontend/features"),
      "@routes": path.resolve(import.meta.dirname, "./src/frontend/routes"),
      "@components": path.resolve(
        import.meta.dirname,
        "./src/frontend/components"
      ),
      "@shared": path.resolve(import.meta.dirname, "./src/shared"),
    },
  },
  build: {
    outDir: "dist/client",
  },
})
