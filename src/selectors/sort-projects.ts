import type { Issue, Project, ProjectSort } from "@/domain";

/**
 * Order the project grid. Pure — `issues` is the live (tombstone-free) list and
 * `now` is passed in, though only the `activity` mode is time-adjacent.
 *
 *  - `name`     — case-insensitive A→Z.
 *  - `added`    — newest project first.
 *  - `activity` — most recently touched OPEN issue first. Done and dismissed
 *                 issues are ignored on purpose: a project where everything is
 *                 resolved is not "active", and counting resolved issues would
 *                 push finished projects to the top of a view meant to show
 *                 what's live. Projects with no open issues sort last, then A→Z.
 */
export function sortProjects(
  projects: readonly Project[],
  issues: readonly Issue[],
  mode: ProjectSort,
  _now: number,
): Project[] {
  const byName = (a: Project, b: Project) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" });

  if (mode === "name") {
    return [...projects].sort(byName);
  }

  if (mode === "added") {
    return [...projects].sort((a, b) => b.createdAt - a.createdAt || byName(a, b));
  }

  const activity = lastOpenActivityByProject(issues);
  return [...projects].sort((a, b) => {
    const av = activity.get(a.id) ?? Number.NEGATIVE_INFINITY;
    const bv = activity.get(b.id) ?? Number.NEGATIVE_INFINITY;
    return bv - av || byName(a, b);
  });
}

function lastOpenActivityByProject(
  issues: readonly Issue[],
): Map<string, number> {
  const out = new Map<string, number>();
  for (const issue of issues) {
    if (issue.status !== "open") continue;
    const stamp = Math.max(issue.createdAt, issue.updatedAt);
    const current = out.get(issue.projectId);
    if (current === undefined || stamp > current) {
      out.set(issue.projectId, stamp);
    }
  }
  return out;
}
