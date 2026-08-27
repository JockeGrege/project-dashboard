import { describe, expect, it } from "vitest";
import type { Issue } from "@/domain";
import { filterProjectIssues } from "./filter-project-issues";

const issue = (
  id: string,
  projectId: string,
  tag: Issue["tag"],
  status: Issue["status"],
  createdAt: number,
): Issue => ({
  id,
  projectId,
  text: id,
  tag,
  status,
  createdAt,
  updatedAt: createdAt,
  resolvedAt: status === "open" ? null : createdAt,
  deletedAt: null,
});

const issues = [
  issue("a", "p1", "bug", "open", 10),
  issue("b", "p1", "enhancement", "done", 20),
  issue("c", "p1", null, "open", 30),
  issue("d", "p1", "bug", "dismissed", 40),
  issue("e", "p2", "bug", "open", 50),
];

describe("filterProjectIssues", () => {
  it("scopes to the project and sorts newest-first", () => {
    expect(
      filterProjectIssues(issues, "p1").map((i) => i.id),
    ).toEqual(["d", "c", "b", "a"]);
  });

  it("filters by exact tag", () => {
    expect(
      filterProjectIssues(issues, "p1", { tag: "bug" }).map((i) => i.id),
    ).toEqual(["d", "a"]);
  });

  it("filters the untagged bucket", () => {
    expect(
      filterProjectIssues(issues, "p1", { tag: "untagged" }).map((i) => i.id),
    ).toEqual(["c"]);
  });

  it("filters by status", () => {
    expect(
      filterProjectIssues(issues, "p1", { status: "open" }).map((i) => i.id),
    ).toEqual(["c", "a"]);
    expect(
      filterProjectIssues(issues, "p1", { status: "dismissed" }).map((i) => i.id),
    ).toEqual(["d"]);
  });

  it("combines tag and status filters", () => {
    expect(
      filterProjectIssues(issues, "p1", { tag: "bug", status: "open" }).map(
        (i) => i.id,
      ),
    ).toEqual(["a"]);
  });

  it("never leaks another project's issues", () => {
    expect(
      filterProjectIssues(issues, "p1", { tag: "bug" }).every(
        (i) => i.projectId === "p1",
      ),
    ).toBe(true);
  });
});
