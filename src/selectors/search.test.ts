import { describe, expect, it } from "vitest";
import type { Issue, Project } from "@/domain";
import { search } from "./search";

const project = (id: string, name: string): Project => ({
  id,
  name,
  categoryId: null,
  description: null,
  repoUrl: null,
  websiteUrl: null,
  hostMachine: null,
  links: [],
  notes: null,
  createdAt: 0,
  updatedAt: 0,
  deletedAt: null,
});

const issue = (id: string, projectId: string, text: string, createdAt: number): Issue => ({
  id,
  projectId,
  text,
  tag: null,
  status: "open",
  createdAt,
  updatedAt: createdAt,
  resolvedAt: null,
  deletedAt: null,
});

const projects = [
  project("p1", "dashboard"),
  project("p2", "sync-engine"),
];
const issues = [
  issue("i1", "p1", "favicon 404s on deep links", 100),
  issue("i2", "p2", "retry backoff too aggressive", 200),
  issue("i3", "p1", "the SYNC token expires early", 300),
  issue("i4", "gone", "orphaned issue about sync", 400),
];

describe("search", () => {
  it("returns nothing for an empty or whitespace query", () => {
    expect(search("", projects, issues)).toEqual({ projects: [], issues: [] });
    expect(search("   ", projects, issues)).toEqual({ projects: [], issues: [] });
  });

  it("matches project names case-insensitively on substrings", () => {
    expect(search("SYNC", projects, issues).projects.map((p) => p.id)).toEqual([
      "p2",
    ]);
  });

  it("matches issue text case-insensitively on substrings", () => {
    const hits = search("sync", projects, issues).issues.map((r) => r.issue.id);
    expect(hits).toEqual(["i3"]);
  });

  it("pairs an issue hit with its project", () => {
    const [row] = search("favicon", projects, issues).issues;
    expect(row!.project.id).toBe("p1");
  });

  it("drops issue hits whose project is missing", () => {
    const hits = search("orphaned", projects, issues).issues;
    expect(hits).toEqual([]);
  });

  it("sorts issue hits newest-first", () => {
    const hits = search("e", projects, issues).issues.map((r) => r.issue.id);
    expect(hits).toEqual(["i3", "i2", "i1"]);
  });
});
