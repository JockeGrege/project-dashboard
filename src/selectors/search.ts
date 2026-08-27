import type { FeedRow, Issue, Project, SearchResult } from "@/domain";

/**
 * Unified search over project names and issue text, matching case-insensitive
 * substrings in either. An issue hit carries the project it belongs to, so a
 * result stays actionable even when you searched by a word in the note rather
 * than the project name.
 *
 * Free and instant because the whole dataset is already in memory. An empty or
 * whitespace query returns nothing.
 */
export function search(
  query: string,
  projects: readonly Project[],
  issues: readonly Issue[],
): SearchResult {
  const q = query.trim().toLowerCase();
  if (q === "") return { projects: [], issues: [] };

  const projectHits = projects.filter((p) =>
    p.name.toLowerCase().includes(q),
  );

  const byId = new Map(projects.map((p) => [p.id, p]));
  const issueHits: FeedRow[] = [];
  for (const issue of issues) {
    if (!issue.text.toLowerCase().includes(q)) continue;
    const project = byId.get(issue.projectId);
    if (!project) continue;
    issueHits.push({ issue, project });
  }
  issueHits.sort((a, b) => b.issue.createdAt - a.issue.createdAt);

  return { projects: projectHits, issues: issueHits };
}
