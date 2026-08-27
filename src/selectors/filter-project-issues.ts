import type { Issue, IssueStatus, TagFilter } from "@/domain";

export interface IssueFilter {
  /** `"all"` = any tag; `"untagged"` matches `tag === null`; otherwise an exact tag. */
  tag?: TagFilter;
  /** `"all"` = any status; otherwise an exact status. */
  status?: IssueStatus | "all";
}

/**
 * The issue list on the project detail screen: one project's issues, filtered by
 * tag and status, newest first.
 *
 * `tag: "untagged"` is a first-class option and always offered, so ideas
 * captured in a hurry without a tag stay findable.
 */
export function filterProjectIssues(
  issues: readonly Issue[],
  projectId: string,
  filter: IssueFilter = {},
): Issue[] {
  const tag = filter.tag ?? "all";
  const status = filter.status ?? "all";

  return issues
    .filter((issue) => {
      if (issue.projectId !== projectId) return false;
      if (status !== "all" && issue.status !== status) return false;
      if (tag === "all") return true;
      if (tag === "untagged") return issue.tag === null;
      return issue.tag === tag;
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}
