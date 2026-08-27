import type { FeedRow, Issue, Project } from "@/domain";

export interface RecentOptions {
  /** Rendering cap. Spec: the 100 most recent. */
  limit?: number;
  /** Show done + dismissed too (the feed's "show resolved" toggle). */
  includeResolved?: boolean;
}

/**
 * The dashboard's recent-issues feed: latest issues across every project, each
 * paired with its project.
 *
 *  - Sorted by `createdAt`, newest first — never `updatedAt`. The feed answers
 *    "when did I write this"; sorting by last-modified would let a typo fix on an
 *    old issue jump to the top and break recall.
 *  - Resolved issues are excluded unless `includeResolved`.
 *  - Issues whose project is missing (deleted) are dropped.
 *  - Capped at `limit` (default 100).
 */
export function recentOpenIssues(
  issues: readonly Issue[],
  projects: readonly Project[],
  options: RecentOptions = {},
): FeedRow[] {
  const limit = options.limit ?? 100;
  const includeResolved = options.includeResolved ?? false;
  const byId = new Map(projects.map((p) => [p.id, p]));

  const rows: FeedRow[] = [];
  for (const issue of issues) {
    if (!includeResolved && issue.status !== "open") continue;
    const project = byId.get(issue.projectId);
    if (!project) continue;
    rows.push({ issue, project });
  }

  rows.sort((a, b) => b.issue.createdAt - a.issue.createdAt);
  return rows.slice(0, Math.max(0, limit));
}
