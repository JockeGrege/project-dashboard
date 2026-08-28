import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "node:url";

// GitHub Pages project site is served from /project-dashboard/.
// A custom domain or <user>.github.io repo would use "/".
const base = process.env.VITE_BASE ?? "/project-dashboard/";

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png", "icon.svg"],
      manifest: {
        name: "Hypomone",
        short_name: "Hypomone",
        description:
          "Improve, never stop. A private board for shaping your projects, one improvement at a time.",
        start_url: base,
        scope: base,
        display: "standalone",
        background_color: "#151617",
        theme_color: "#151617",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "pwa-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,woff2,svg,png,webmanifest}"],
        // Hash routing means index.html is always the shell — serve it offline.
        navigateFallback: `${base}index.html`,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ["firebase/app", "firebase/firestore", "firebase/auth"],
          react: ["react", "react-dom", "react-router-dom"],
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // *.emulator.test.ts run against the Firebase Emulator Suite via their own
    // config (npm run test:emulator), not in the default unit run.
    exclude: ["src/**/*.emulator.test.ts", "node_modules", "playwright", "dist"],
  },
});
