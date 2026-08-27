import { createInMemoryStore, FirestoreStore, type Store } from "@/store";
import { readRuntimeEnv } from "@/firebase/env";
import { getDb } from "@/firebase/init";
import { SEED } from "@/test/fixtures";

/**
 * Builds the app's Store from `VITE_FIREBASE_TARGET`:
 *
 *  - `memory`   — the seeded in-memory adapter. No Firebase, no setup. Default.
 *  - `emulator` — `FirestoreStore` pointed at the local Emulator Suite.
 *  - `live`     — `FirestoreStore` pointed at production Firestore.
 *
 * `getDb()` runs the one-time `initializeFirestore` cache configuration before
 * any read or write.
 */
export function createAppStore(): Store {
  const { target } = readRuntimeEnv();
  if (target === "memory") {
    return createInMemoryStore({ seed: SEED });
  }
  return new FirestoreStore(getDb());
}
