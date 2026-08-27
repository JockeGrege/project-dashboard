/**
 * Reads and validates the Firebase config from Vite env vars. These are not
 * secrets (they ship in the client bundle) but they live in env so CI can inject
 * them per environment. See ARCHITECTURE.md §6–7.
 */

export interface FirebaseEnv {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export type StoreTarget = "memory" | "emulator" | "live";

export interface RuntimeEnv {
  firebase: FirebaseEnv;
  /**
   * "memory" runs entirely on the seeded in-memory adapter (no Firebase, no
   * setup); "emulator" talks to the local Emulator Suite; "live" talks to
   * production Firestore + Auth.
   */
  target: StoreTarget;
  /** The single account allowed to read/write. `null` until first sign-in. */
  allowedUid: string | null;
}

const UNSET = "__REPLACE_ME__";

function required(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env and fill in the Firebase config.`,
    );
  }
  return value;
}

function readTarget(): StoreTarget {
  const raw = import.meta.env.VITE_FIREBASE_TARGET;
  if (raw === "live" || raw === "emulator" || raw === "memory") return raw;
  return "memory";
}

export function readRuntimeEnv(): RuntimeEnv {
  const rawUid = import.meta.env.VITE_ALLOWED_UID;
  const target = readTarget();

  const firebase: FirebaseEnv =
    target === "memory"
      ? {
          apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "",
          authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
          projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "demo",
          storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "",
          messagingSenderId:
            import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
          appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "",
        }
      : {
          apiKey: required("VITE_FIREBASE_API_KEY"),
          authDomain: required("VITE_FIREBASE_AUTH_DOMAIN"),
          projectId: required("VITE_FIREBASE_PROJECT_ID"),
          storageBucket: required("VITE_FIREBASE_STORAGE_BUCKET"),
          messagingSenderId: required("VITE_FIREBASE_MESSAGING_SENDER_ID"),
          appId: required("VITE_FIREBASE_APP_ID"),
        };

  return {
    firebase,
    target,
    allowedUid: !rawUid || rawUid === UNSET ? null : rawUid,
  };
}
