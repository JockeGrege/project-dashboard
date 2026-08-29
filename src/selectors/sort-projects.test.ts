import { describe, expect, it } from "vitest";
import type { Issue, Project } from "@/domain";
import { sortProjects } from "./sort-projects";

const NOW = 1_000_000;

const project = (id: string, name: string, createdAt: number): Project => ({
  id,
  name,
  categoryId: null,
  description: null,
  repoUrl: null,
  websiteUrl: null,
  hostMachine: null,
  links: [],
  notes: null,
  createdAt,
  updatedAt: createdAt,
  deletedAt: null,
});

const issue = (
  id: string,
  projectId: string,
  status: Issue["status"],
  createdAt: number,
  updatedAt = createdAt,
): Issue => ({
  id,
  projectId,
  text: id,
  tag: null,
  status,
  attachments: [],
  createdAt,
  updatedAt,
  resolvedAt: status === "open" ? null : updatedAt,
  deletedAt: null,
});

const alpha = project("a", "alpha", 300);
const bravo = project("b", "Bravo", 100);
const charlie = project("c", "charlie", 200);
const projects = [charlie, alpha, bravo];

describe("sortProjects", () => {
  it("name: case-insensitive A→Z", () => {
    expect(sortProjects(projects, [], "name", NOW).map((p) => p.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("added: newest project first, name breaks ties", () => {
    const twin = project("d", "alpha", 300);
    expect(
      sortProjects([...projects, twin], [], "added", NOW).map((p) => p.id),
    ).toEqual(["a", "d", "c", "b"]);
  });

  it("activity: most recent OPEN issue first", () => {
    const issues = [
      issue("i1", "b", "open", 500),
      issue("i2", "c", "open", 900),
      issue("i3", "a", "open", 100),
    ];
    expect(
      sortProjects(projects, issues, "activity", NOW).map((p) => p.id),
    ).toEqual(["c", "b", "a"]);
  });

  it("activity: ignores done and dismissed issues", () => {
    const issues = [
      issue("i1", "a", "done", 999, 999),
      issue("i2", "a", "dismissed", 998, 998),
      issue("i3", "b", "open", 400),
    ];
    const ids = sortProjects(projects, issues, "activity", NOW).map((p) => p.id);
    expect(ids[0]).toBe("b");
    // a and c have no open issues -> sorted last, then A→Z
    expect(ids.slice(1)).toEqual(["a", "c"]);
  });

  it("activity: uses max(createdAt, updatedAt) of open issues", () => {
    const issues = [
      issue("i1", "a", "open", 100, 800),
      issue("i2", "b", "open", 500, 500),
    ];
    expect(
      sortProjects(projects, issues, "activity", NOW).map((p) => p.id),
    ).toEqual(["a", "b", "c"]);
  });

  it("does not mutate the input array", () => {
    const input = [...projects];
    sortProjects(input, [], "name", NOW);
    expect(input).toEqual([charlie, alpha, bravo]);
  });
});
