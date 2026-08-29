import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;
const BASE = `http://localhost:${PORT}/project-dashboard/`;

/**
 * One smoke test for the capture path. Runs against the dev server in `memory`
 * mode (no Firebase), because the spec warns that an e2e suite pointed at real
 * Firestore is the most plausible way to exhaust the read quota.
 */
export default defineConfig({
  testDir: "./playwright",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: BASE,
    colorScheme: "dark",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: BASE,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    // Force the offline adapters regardless of a developer's local .env:
    // memory store, and the fake image uploader (empty upload URL).
    env: { VITE_FIREBASE_TARGET: "memory", VITE_IMAGE_UPLOAD_URL: "" },
  },
});
