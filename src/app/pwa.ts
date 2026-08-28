import { useEffect, useState } from "react";
import { registerSW } from "virtual:pwa-register";

/** Registers the service worker; auto-updates on next load when a new build ships. */
export function registerServiceWorker(): void {
  if (import.meta.env.DEV) return;
  registerSW({ immediate: true });
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    listeners.forEach((l) => l());
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    listeners.forEach((l) => l());
  });
}

/**
 * `canInstall` is true when the browser has offered an install prompt and the
 * app isn't already installed. `install()` shows it.
 */
export function useInstallPrompt(): { canInstall: boolean; install: () => void } {
  const [canInstall, setCanInstall] = useState(deferredPrompt !== null);

  useEffect(() => {
    const update = () => setCanInstall(deferredPrompt !== null);
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, []);

  const install = () => {
    const prompt = deferredPrompt;
    if (!prompt) return;
    void prompt.prompt().finally(() => {
      deferredPrompt = null;
      listeners.forEach((l) => l());
    });
  };

  return { canInstall, install };
}
