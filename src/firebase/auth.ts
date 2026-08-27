import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { getAuthClient, getRuntimeEnv } from "./init";

export interface AuthState {
  /** Signed-in user's UID, or null. */
  uid: string | null;
  /** True once Firebase has reported the initial auth state. */
  ready: boolean;
  /**
   * Set when someone is signed in but `VITE_ALLOWED_UID` is not yet configured.
   * The app shows this UID so it can be pasted into `.env`, the Actions secret,
   * and `firestore.rules`. Enforcement is skipped until the value is set.
   */
  unpinnedUid: string | null;
}

const provider = new GoogleAuthProvider();

export function signInWithGoogle(): Promise<unknown> {
  return signInWithPopup(getAuthClient(), provider);
}

export function signOut(): Promise<void> {
  return fbSignOut(getAuthClient());
}

/**
 * Subscribe to auth state. Enforces the single-UID rule as defence in depth
 * alongside `firestore.rules`: a wrong account is signed straight back out.
 */
export function onAuthChange(listener: (state: AuthState) => void): () => void {
  const { allowedUid } = getRuntimeEnv();

  return onAuthStateChanged(getAuthClient(), (user: User | null) => {
    if (!user) {
      listener({ uid: null, ready: true, unpinnedUid: null });
      return;
    }

    if (allowedUid === null) {
      // Not configured yet — surface the UID instead of enforcing.
      listener({ uid: user.uid, ready: true, unpinnedUid: user.uid });
      return;
    }

    if (user.uid !== allowedUid) {
      void fbSignOut(getAuthClient());
      listener({ uid: null, ready: true, unpinnedUid: null });
      return;
    }

    listener({ uid: user.uid, ready: true, unpinnedUid: null });
  });
}
