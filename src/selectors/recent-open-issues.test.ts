import { describe, expect, it } from "vitest";
import type { Issue, Project } from "@/domain";
import { recentOpenIssues } from "./recent-open-issues";

const project = (id: string): Project => ({
  id,
  name: id,
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
  createdAt,
  updatedAt,
  resolvedAt: status === "open" ? null : updatedAt,
  deletedAt: null,
});

const projects = [project("a"), project("b")];

describe("recentOpenIssues", () => {
  it("returns open issues newest-first by createdAt", () => {
    const issues = [
      issue("i1", "a", "open", 100),
      issue("i2", "b", "open", 300),
      issue("i3", "a", "open", 200),
    ];
    expect(
      recentOpenIssues(issues, projects).map((r) => r.issue.id),
    ).toEqual(["i2", "i3", "i1"]);
  });

  it("sorts by createdAt even when updatedAt is newer", () => {
    const issues = [
      issue("old-edited", "a", "open", 100, 999),
      issue("new", "b", "open", 500, 500),
    ];
    expect(
      recentOpenIssues(issues, projects).map((r) => r.issue.id),
    ).toEqual(["new", "old-edited"]);
  });

  it("excludes resolved issues by default", () => {
    const issues = [
      issue("open", "a", "open", 100),
      issue("done", "a", "done", 200),
      issue("dismissed", "a", "dismissed", 300),
    ];
    expect(recentOpenIssues(issues, projects).map((r) => r.issue.id)).toEqual([
      "open",
    ]);
  });

  it("includes resolved issues when asked", () => {
    const issues = [
      issue("open", "a", "open", 100),
      issue("done", "a", "done", 200),
    ];
    expect(
      recentOpenIssues(issues, projects, { includeResolved: true }).map(
        (r) => r.issue.id,
      ),
    ).toEqual(["done", "open"]);
  });

  it("drops issues whose project is missing", () => {
    const issues = [
      issue("kept", "a", "open", 100),
      issue("orphan", "gone", "open", 200),
    ];
    expect(recentOpenIssues(issues, projects).map((r) => r.issue.id)).toEqual([
      "kept",
    ]);
  });

  it("pairs each issue with its project", () => {
    const [row] = recentOpenIssues([issue("i1", "b", "open", 1)], projects);
    expect(row!.project.id).toBe("b");
  });

  it("caps at the limit", () => {
    const issues = Array.from({ length: 150 }, (_, n) =>
      issue(`i${n}`, "a", "open", n),
    );
    expect(recentOpenIssues(issues, projects)).toHaveLength(100);
    expect(recentOpenIssues(issues, projects, { limit: 5 })).toHaveLength(5);
  });
});
