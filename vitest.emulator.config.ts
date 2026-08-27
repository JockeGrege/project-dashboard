import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

// Integration tests that talk to the Firebase Emulator Suite. Run via
// `npm run test:emulator`, which starts the emulators around this.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.emulator.test.ts"],
    testTimeout: 20000,
    hookTimeout: 20000,
    fileParallelism: false,
  },
});
