import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import type { Firestore } from "firebase/firestore";

export const EMULATOR_HOST = "127.0.0.1";
export const EMULATOR_PORT = 8095;

/**
 * A test environment for exercising the `FirestoreStore` *adapter* (not the
 * security rules — those have their own test). Rules are wide open here so the
 * adapter's behaviour is what's under test; the store is handed an authenticated
 * client so it behaves exactly as it will in the app.
 */
let env: RulesTestEnvironment | undefined;

export async function getTestEnv(): Promise<RulesTestEnvironment> {
  if (!env) {
    env = await initializeTestEnvironment({
      projectId: "progress-board-adapter",
      firestore: {
        host: EMULATOR_HOST,
        port: EMULATOR_PORT,
        rules: `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} { allow read, write: if true; }
  }
}`,
      },
    });
  }
  return env;
}

export async function teardownTestEnv(): Promise<void> {
  await env?.cleanup();
  env = undefined;
}

export async function clearFirestore(): Promise<void> {
  await (await getTestEnv()).clearFirestore();
}

/** An authenticated Firestore client pointed at the emulator. */
export async function makeStoreDb(): Promise<Firestore> {
  const context = (await getTestEnv()).authenticatedContext("test-owner");
  return context.firestore() as unknown as Firestore;
}

/** Poll until `predicate` is true or the timeout elapses. */
export async function waitFor(
  predicate: () => boolean,
  { timeout = 5000, interval = 25 } = {},
): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeout) {
      throw new Error("waitFor timed out");
    }
    await new Promise((r) => setTimeout(r, interval));
  }
}
