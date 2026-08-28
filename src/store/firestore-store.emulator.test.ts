import { afterAll, beforeEach, afterEach, describe, expect, it } from "vitest";
import {
  clearFirestore,
  makeStoreDb,
  teardownTestEnv,
  waitFor,
} from "@/test/emulator";
import { FirestoreStore } from "./firestore-store";

/**
 * Integration tests against the Firebase Emulator Suite. Run with
 * `npm run test:emulator` (which boots the emulators around this file).
 */

let store: FirestoreStore;

beforeEach(async () => {
  await clearFirestore();
  store = new FirestoreStore(await makeStoreDb());
  await waitFor(() => store.getSnapshot().status === "ready");
});

afterEach(() => {
  store.dispose();
});

afterAll(async () => {
  await teardownTestEnv();
});

const snap = () => store.getSnapshot();

async function seedProject(name = "dashboard"): Promise<string> {
  const id = await store.createProject({
    name,
    categoryId: null,
    description: null,
    repoUrl: null,
    websiteUrl: null,
    hostMachine: null,
  });
  await waitFor(() => snap().projects.some((p) => p.id === id));
  return id;
}

describe("FirestoreStore (emulator)", () => {
  it("reports ready with an empty dataset", () => {
    expect(snap().status).toBe("ready");
    expect(snap().projects).toEqual([]);
  });

  it("round-trips a project through the listener", async () => {
    const id = await seedProject("core");
    const project = snap().projects.find((p) => p.id === id);
    expect(project?.name).toBe("core");
    expect(project?.createdAt).toBeTypeOf("number");
  });

  it("creates an optional first issue with the project", async () => {
    const id = await store.createProject({
      name: "sync",
      categoryId: null,
      description: null,
      repoUrl: null,
      websiteUrl: null,
      hostMachine: null,
      firstIssue: { text: "wire up CI", tag: "enhancement" },
    });
    await waitFor(() => snap().issues.some((i) => i.projectId === id));
    const issue = snap().issues.find((i) => i.projectId === id);
    expect(issue).toMatchObject({ text: "wire up CI", tag: "enhancement", status: "open" });
  });

  it("stamps and clears resolvedAt through setIssueStatus only", async () => {
    const projectId = await seedProject();
    const issueId = await store.createIssue({ projectId, text: "x", tag: null });
    await waitFor(() => snap().issues.some((i) => i.id === issueId));

    await store.setIssueStatus(issueId, "done");
    await waitFor(() => snap().issues.find((i) => i.id === issueId)?.status === "done");
    expect(snap().issues.find((i) => i.id === issueId)?.resolvedAt).toBeTypeOf("number");

    await store.setIssueStatus(issueId, "open");
    await waitFor(() => snap().issues.find((i) => i.id === issueId)?.status === "open");
    expect(snap().issues.find((i) => i.id === issueId)?.resolvedAt).toBeNull();
  });

  it("soft-deletes an issue, then purge hard-deletes it and stamps lastPurgeAt", async () => {
    const projectId = await seedProject();
    const keep = await store.createIssue({ projectId, text: "keep", tag: null });
    const drop = await store.createIssue({ projectId, text: "drop", tag: null });
    await waitFor(() => snap().issues.length === 2);

    await store.deleteIssue(drop);
    await waitFor(() => snap().issues.length === 1);

    const removed = await store.purgeDeletedIssues();
    expect(removed).toBe(1);
    await waitFor(() => snap().settings.lastPurgeAt !== null);
    expect(snap().issues.map((i) => i.id)).toEqual([keep]);
  });

  it("cascades a project soft-delete to its issues", async () => {
    const projectId = await seedProject();
    await store.createIssue({ projectId, text: "a", tag: null });
    await waitFor(() => snap().issues.length === 1);

    await store.deleteProject(projectId);
    await waitFor(() => snap().projects.length === 0 && snap().issues.length === 0);
  });

  it("moves a deleted category's projects to Uncategorised", async () => {
    const categoryId = await store.createCategory({ name: "Work", colour: "#6fae82" });
    await waitFor(() => snap().categories.some((c) => c.id === categoryId));
    const projectId = await store.createProject({
      name: "dashboard",
      categoryId,
      description: null,
      repoUrl: null,
      websiteUrl: null,
      hostMachine: null,
    });
    await waitFor(() => snap().projects.some((p) => p.id === projectId));

    await store.deleteCategory(categoryId);
    await waitFor(() => snap().categories.length === 0);
    expect(snap().projects.find((p) => p.id === projectId)?.categoryId).toBeNull();
  });

  it("persists settings via the shared meta doc", async () => {
    await store.updateSettings({ viewMode: "category", cardsPerPage: 9 });
    await waitFor(() => snap().settings.viewMode === "category");
    expect(snap().settings.cardsPerPage).toBe(9);
  });
});
