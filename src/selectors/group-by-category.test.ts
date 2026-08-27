import { describe, expect, it } from "vitest";
import type { Category, Project } from "@/domain";
import { groupByCategory } from "./group-by-category";

const project = (id: string, categoryId: string | null): Project => ({
  id,
  name: id,
  categoryId,
  repoUrl: null,
  hostMachine: null,
  createdAt: 0,
  updatedAt: 0,
  deletedAt: null,
});

const category = (id: string, name: string, sortOrder: number): Category => ({
  id,
  name,
  colour: "#6fae82",
  sortOrder,
});

const work = category("work", "Work", 0);
const personal = category("personal", "Personal", 1);

describe("groupByCategory", () => {
  it("groups projects under their category in sortOrder", () => {
    const groups = groupByCategory(
      [project("p1", "personal"), project("p2", "work"), project("p3", "work")],
      [personal, work],
    );
    expect(groups.map((g) => g.label)).toEqual(["Work", "Personal"]);
    expect(groups[0]!.projects.map((p) => p.id)).toEqual(["p2", "p3"]);
    expect(groups[1]!.projects.map((p) => p.id)).toEqual(["p1"]);
  });

  it("appends Uncategorised last, only when non-empty", () => {
    const withOrphan = groupByCategory(
      [project("p1", "work"), project("p2", null)],
      [work],
    );
    expect(withOrphan.map((g) => g.label)).toEqual(["Work", "Uncategorised"]);
    expect(withOrphan[1]!.category).toBeNull();

    const noOrphan = groupByCategory([project("p1", "work")], [work]);
    expect(noOrphan.map((g) => g.label)).toEqual(["Work"]);
  });

  it("treats a dangling categoryId as Uncategorised", () => {
    const groups = groupByCategory([project("p1", "ghost")], [work], {
      includeEmpty: false,
    });
    expect(groups.map((g) => g.label)).toEqual(["Uncategorised"]);
    expect(groups[0]!.projects.map((p) => p.id)).toEqual(["p1"]);
  });

  it("keeps empty categories by default, drops them when asked", () => {
    const kept = groupByCategory([project("p1", "work")], [work, personal]);
    expect(kept.map((g) => g.label)).toEqual(["Work", "Personal"]);

    const dropped = groupByCategory([project("p1", "work")], [work, personal], {
      includeEmpty: false,
    });
    expect(dropped.map((g) => g.label)).toEqual(["Work"]);
  });

  it("carries the category accent colour onto the group", () => {
    const [group] = groupByCategory([project("p1", "work")], [work]);
    expect(group!.colour).toBe("#6fae82");
    expect(group!.key).toBe("work");
  });
});
