import { useMemo } from "react";
import { RouterProvider } from "react-router-dom";
import { StoreProvider, type Store } from "@/store";
import { readRuntimeEnv } from "@/firebase/env";
import { createAppStore } from "./create-store";
import { AuthGate } from "./AuthGate";
import { ToastProvider } from "./toast";
import { router } from "./router";

function Shell({ store }: { store: Store }) {
  return (
    <StoreProvider store={store}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </StoreProvider>
  );
}

/**
 * Chooses the runtime path. In `memory` mode the app boots straight into the
 * seeded store; in `emulator`/`live` mode `AuthGate` handles Google sign-in and
 * the single-UID check before the Firestore-backed store is constructed.
 */
export function Root() {
  const target = readRuntimeEnv().target;
  const memoryStore = useMemo(
    () => (target === "memory" ? createAppStore() : null),
    [target],
  );

  if (memoryStore) return <Shell store={memoryStore} />;
  return <AuthGate render={(store) => <Shell store={store} />} />;
}
