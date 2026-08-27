import { readFile } from "node:fs/promises";
import { fileURLToPath, URL } from "node:url";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";

const OWNER = "owner-uid";
const INTRUDER = "someone-else";

let env: RulesTestEnvironment;

beforeAll(async () => {
  const rulesPath = fileURLToPath(
    new URL("../../firestore.rules", import.meta.url),
  );
  const rules = (await readFile(rulesPath, "utf8")).replace(
    "REPLACE_WITH_VITE_ALLOWED_UID",
    OWNER,
  );
  env = await initializeTestEnvironment({
    projectId: "progress-board-rules",
    firestore: { rules, host: "127.0.0.1", port: 8095 },
  });
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
});

describe("firestore.rules", () => {
  it("lets the pinned owner read and write", async () => {
    const db = env.authenticatedContext(OWNER).firestore();
    await assertSucceeds(setDoc(doc(db, "projects/p1"), { name: "dashboard" }));
    await assertSucceeds(getDoc(doc(db, "projects/p1")));
  });

  it("denies a different signed-in account", async () => {
    const db = env.authenticatedContext(INTRUDER).firestore();
    await assertFails(setDoc(doc(db, "projects/p1"), { name: "x" }));
    await assertFails(getDoc(doc(db, "projects/p1")));
  });

  it("denies unauthenticated access", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "projects/p1")));
  });
});
