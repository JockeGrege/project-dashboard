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
  // Read the template directly so the test doesn't depend on `gen:rules` having
  // run, and pin it to a known owner.
  const templatePath = fileURLToPath(
    new URL("../../firestore.rules.template", import.meta.url),
  );
  const rules = (await readFile(templatePath, "utf8")).replaceAll(
    "__ALLOWED_UID__",
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
