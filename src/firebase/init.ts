import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";
import {
  connectAuthEmulator,
  getAuth,
  type Auth,
} from "firebase/auth";
import { readRuntimeEnv, type RuntimeEnv } from "./env";

/**
 * The single place the Firebase SDK is initialised. Nothing outside `src/firebase`
 * and `src/store` may import `firebase/*` (enforced by eslint), so the cache
 * configuration below is guaranteed to run before any read or write — if it ran
 * late, `initializeFirestore` would silently fall back to a memory cache.
 */

let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let auth: Auth | undefined;
let env: RuntimeEnv | undefined;

function ensure(): { db: Firestore; auth: Auth; env: RuntimeEnv } {
  if (!app || !db || !auth || !env) {
    env = readRuntimeEnv();
    app = initializeApp(env.firebase);

    // Persistent multi-tab cache. A reconnecting listener then resumes from a
    // stored token and is billed only for changed documents.
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });

    auth = getAuth(app);

    if (env.target === "emulator") {
      connectFirestoreEmulator(db, "127.0.0.1", 8095);
      connectAuthEmulator(auth, "http://127.0.0.1:9095", {
        disableWarnings: true,
      });
    }
  }
  return { db, auth, env };
}

export const getDb = (): Firestore => ensure().db;
export const getAuthClient = (): Auth => ensure().auth;
export const getRuntimeEnv = (): RuntimeEnv => ensure().env;
