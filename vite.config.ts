import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// GitHub Pages project site is served from /project-dashboard/.
// A custom domain or <user>.github.io repo would use "/".
const base = process.env.VITE_BASE ?? "/project-dashboard/";

export default defineConfig({
  base,
  plugins: [react()],
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
