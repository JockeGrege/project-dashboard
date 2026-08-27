import { useEffect, useMemo, useState, type ReactNode } from "react";
import { FirestoreStore, type Store } from "@/store";
import { getDb } from "@/firebase/init";
import {
  onAuthChange,
  signInWithGoogle,
  signOut,
  type AuthState,
} from "@/firebase/auth";
import styles from "./AuthGate.module.css";

interface AuthGateProps {
  render: (store: Store) => ReactNode;
}

const INITIAL: AuthState = { uid: null, ready: false, unpinnedUid: null };

export function AuthGate({ render }: AuthGateProps) {
  const [auth, setAuth] = useState<AuthState>(INITIAL);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => onAuthChange(setAuth), []);

  const effectiveUid = auth.uid ?? auth.unpinnedUid;
  const store = useMemo(
    () => (effectiveUid ? new FirestoreStore(getDb()) : null),
    [effectiveUid],
  );

  useEffect(() => () => store?.dispose(), [store]);

  if (!auth.ready) {
    return <div className={styles.splash}>Connecting…</div>;
  }

  if (!store) {
    return (
      <div className={styles.splash}>
        <div className={styles.card}>
          <p className={styles.mark} aria-hidden="true">
            ◧
          </p>
          <h1 className={styles.title}>improvements</h1>
          <p className={styles.sub}>Sign in to reach your board.</p>
          <button
            type="button"
            className={styles.signIn}
            disabled={signingIn}
            onClick={async () => {
              setSigningIn(true);
              setError(null);
              try {
                await signInWithGoogle();
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : "Sign-in failed.",
                );
                setSigningIn(false);
              }
            }}
          >
            {signingIn ? "Opening Google…" : "Continue with Google"}
          </button>
          {error ? <p className={styles.error}>{error}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <>
      {auth.unpinnedUid ? (
        <div className={styles.banner}>
          <span>
            Signed in, but <code>VITE_ALLOWED_UID</code> isn’t set. Paste this UID
            into <code>.env</code>, the GitHub Actions secret, and{" "}
            <code>firestore.rules</code>, then reload:
          </span>
          <button
            type="button"
            className={styles.copy}
            onClick={() => navigator.clipboard?.writeText(auth.unpinnedUid ?? "")}
          >
            {auth.unpinnedUid}
          </button>
          <button type="button" className={styles.signOut} onClick={() => signOut()}>
            sign out
          </button>
        </div>
      ) : null}
      {render(store)}
    </>
  );
}
