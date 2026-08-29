import { beforeEach, describe, expect, it, vi } from "vitest";
import { InMemoryStore } from "./in-memory-store";

let clock = 1_000;
const tick = () => (clock += 1_000);

let store: InMemoryStore;
let ids = 0;

beforeEach(() => {
  clock = 1_000;
  ids = 0;
  store = new InMemoryStore({
    now: () => clock,
    newId: () => `id_${++ids}`,
  });
});

const seedProject = async () =>
  store.createProject({
    name: "dashboard",
    categoryId: null,
    description: null,
    repoUrl: null,
    websiteUrl: null,
    hostMachine: null,
  });

describe("InMemoryStore — snapshot", () => {
  it("starts ready with an empty dataset", () => {
    const snap = store.getSnapshot();
    expect(snap.status).toBe("ready");
    expect(snap.projects).toEqual([]);
    expect(snap.issues).toEqual([]);
  });

  it("returns a stable reference until a mutation happens", async () => {
    const a = store.getSnapshot();
    expect(store.getSnapshot()).toBe(a);
    await seedProject();
    expect(store.getSnapshot()).not.toBe(a);
  });

  it("notifies subscribers on mutation", async () => {
    const listener = vi.fn();
    store.subscribe(listener);
    await seedProject();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("hides tombstoned issues and projects from the snapshot", async () => {
    const projectId = await seedProject();
    const issueId = await store.createIssue({
      projectId,
      text: "keep me",
      tag: null,
    });
    await store.deleteIssue(issueId);
    expect(store.getSnapshot().issues).toEqual([]);
  });

  it("counts deleted-issue tombstones for the purge line", async () => {
    const projectId = await seedProject();
    const a = await store.createIssue({ projectId, text: "a", tag: null });
    await store.createIssue({ projectId, text: "b", tag: null });
    expect(store.getSnapshot().deletedIssueCount).toBe(0);
    await store.deleteIssue(a);
    expect(store.getSnapshot().deletedIssueCount).toBe(1);
    await store.purgeDeletedIssues();
    expect(store.getSnapshot().deletedIssueCount).toBe(0);
  });
});

describe("InMemoryStore — resolvedAt bookkeeping", () => {
  it("stamps resolvedAt when an open issue is resolved", async () => {
    const projectId = await seedProject();
    const id = await store.createIssue({ projectId, text: "x", tag: null });
    const at = tick();
    await store.setIssueStatus(id, "done");
    const issue = store.getSnapshot().issues.find((i) => i.id === id)!;
    expect(issue.status).toBe("done");
    expect(issue.resolvedAt).toBe(at);
  });

  it("clears resolvedAt when an issue is reopened", async () => {
    const projectId = await seedProject();
    const id = await store.createIssue({ projectId, text: "x", tag: null });
    await store.setIssueStatus(id, "dismissed");
    await store.setIssueStatus(id, "open");
    const issue = store.getSnapshot().issues.find((i) => i.id === id)!;
    expect(issue.resolvedAt).toBeNull();
  });

  it("does not move resolvedAt when switching done -> dismissed", async () => {
    const projectId = await seedProject();
    const id = await store.createIssue({ projectId, text: "x", tag: null });
    const firstResolve = tick();
    await store.setIssueStatus(id, "done");
    tick();
    await store.setIssueStatus(id, "dismissed");
    const issue = store.getSnapshot().issues.find((i) => i.id === id)!;
    expect(issue.status).toBe("dismissed");
    expect(issue.resolvedAt).toBe(firstResolve);
  });
});

describe("InMemoryStore — purge", () => {
  it("hard-deletes only tombstones and stamps lastPurgeAt", async () => {
    const projectId = await seedProject();
    const a = await store.createIssue({ projectId, text: "a", tag: null });
    await store.createIssue({ projectId, text: "b", tag: null });
    await store.deleteIssue(a);

    const at = tick();
    const removed = await store.purgeDeletedIssues();

    expect(removed).toBe(1);
    expect(store.getSnapshot().issues.map((i) => i.text)).toEqual(["b"]);
    expect(store.getSnapshot().settings.lastPurgeAt).toBe(at);
  });
});

describe("InMemoryStore — projects", () => {
  it("creates an optional first issue with the project", async () => {
    const projectId = await store.createProject({
      name: "core",
      categoryId: null,
      description: null,
      repoUrl: null,
      websiteUrl: null,
      hostMachine: null,
      firstIssue: { text: "wire up CI", tag: "enhancement" },
    });
    const issues = store.getSnapshot().issues;
    expect(issues).toHaveLength(1);
    expect(issues[0]!).toMatchObject({
      projectId,
      text: "wire up CI",
      tag: "enhancement",
      status: "open",
    });
  });

  it("cascades a soft delete to the project's issues", async () => {
    const projectId = await seedProject();
    await store.createIssue({ projectId, text: "a", tag: null });
    await store.deleteProject(projectId);
    const snap = store.getSnapshot();
    expect(snap.projects).toEqual([]);
    expect(snap.issues).toEqual([]);
  });

  it("starts a project with an empty link list and no notes", async () => {
    const projectId = await seedProject();
    const project = store.getSnapshot().projects.find((p) => p.id === projectId)!;
    expect(project.links).toEqual([]);
    expect(project.notes).toBeNull();
    expect(project.websiteUrl).toBeNull();
  });

  it("updates description, website, notes and a sanitised link list", async () => {
    const projectId = await seedProject();
    await store.updateProject(projectId, {
      description: "  a tracker  ",
      websiteUrl: "https://board.example.com",
      notes: "## Deploy\n- run it",
      links: [
        { label: " Console ", url: " https://console.example.com " },
        { label: "", url: "https://dropme.example.com" },
        { label: "Bad", url: "nope" },
      ],
    });
    const project = store.getSnapshot().projects.find((p) => p.id === projectId)!;
    expect(project.description).toBe("a tracker");
    expect(project.websiteUrl).toBe("https://board.example.com");
    expect(project.notes).toBe("## Deploy\n- run it");
    expect(project.links).toEqual([
      { label: "Console", url: "https://console.example.com" },
    ]);
  });

  it("rejects an issue on a missing project", async () => {
    await expect(
      store.createIssue({ projectId: "nope", text: "x", tag: null }),
    ).rejects.toThrow(/no project/i);
  });

  it("rejects empty text", async () => {
    const projectId = await seedProject();
    await expect(
      store.createIssue({ projectId, text: "   ", tag: null }),
    ).rejects.toThrow(/can't be empty/i);
  });
});

describe("InMemoryStore — attachments", () => {
  it("files an issue with a sanitised, capped attachment list", async () => {
    const projectId = await seedProject();
    const id = await store.createIssue({
      projectId,
      text: "screenshot attached",
      tag: null,
      attachments: [
        "https://i.ibb.co/a.png",
        "https://i.ibb.co/a.png", // duplicate — dropped
        "not-a-url", // junk — dropped
        "https://i.ibb.co/b.png",
      ],
    });
    const issue = store.getSnapshot().issues.find((i) => i.id === id)!;
    expect(issue.attachments).toEqual([
      "https://i.ibb.co/a.png",
      "https://i.ibb.co/b.png",
    ]);
  });

  it("defaults to an empty attachment list", async () => {
    const projectId = await seedProject();
    const id = await store.createIssue({ projectId, text: "no images", tag: null });
    const issue = store.getSnapshot().issues.find((i) => i.id === id)!;
    expect(issue.attachments).toEqual([]);
  });
});

describe("InMemoryStore — categories", () => {
  it("assigns an incrementing sortOrder", async () => {
    await store.createCategory({ name: "Work", colour: "#6fae82" });
    await store.createCategory({ name: "Personal", colour: "#8e8ad9" });
    expect(store.getSnapshot().categories.map((c) => c.sortOrder)).toEqual([
      0, 1,
    ]);
  });

  it("falls back to a valid colour when given a junk one", async () => {
    await store.createCategory({ name: "Work", colour: "not-a-colour" });
    expect(store.getSnapshot().categories[0]!.colour).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("moves a deleted category's projects to Uncategorised", async () => {
    const categoryId = await store.createCategory({
      name: "Work",
      colour: "#6fae82",
    });
    const projectId = await store.createProject({
      name: "dashboard",
      categoryId,
      description: null,
      repoUrl: null,
      websiteUrl: null,
      hostMachine: null,
    });
    await store.deleteCategory(categoryId);
    const snap = store.getSnapshot();
    expect(snap.categories).toEqual([]);
    expect(snap.projects.find((p) => p.id === projectId)!.categoryId).toBeNull();
  });

  it("reorders categories by the given id list", async () => {
    const a = await store.createCategory({ name: "A", colour: "#6fae82" });
    const b = await store.createCategory({ name: "B", colour: "#8e8ad9" });
    const c = await store.createCategory({ name: "C", colour: "#c98a6b" });
    await store.reorderCategories([c, a, b]);
    expect(store.getSnapshot().categories.map((cat) => cat.name)).toEqual([
      "C",
      "A",
      "B",
    ]);
  });
});
