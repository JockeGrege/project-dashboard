import type {
  Category,
  Issue,
  IssueStatus,
  Project,
  ProjectLink,
  Settings,
  Tag,
} from "./schemas";

/**
 * Write inputs and patches. Deliberately narrow: the Store owns every derived
 * field (`id`, all timestamps, `resolvedAt`, `deletedAt`), so callers cannot set
 * them by accident.
 */

export interface NewIssueInput {
  projectId: string;
  text: string;
  tag: Tag | null;
}

export interface NewProjectInput {
  name: string;
  categoryId: string | null;
  description: string | null;
  repoUrl: string | null;
  websiteUrl: string | null;
  hostMachine: string | null;
  /** Optional first issue from the wizard's last step. */
  firstIssue?: { text: string; tag: Tag | null };
}

export interface ProjectPatch {
  name?: string;
  categoryId?: string | null;
  description?: string | null;
  repoUrl?: string | null;
  websiteUrl?: string | null;
  hostMachine?: string | null;
  links?: ProjectLink[];
  notes?: string | null;
}

export interface NewCategoryInput {
  name: string;
  colour: string;
}

export interface CategoryPatch {
  name?: string;
  colour?: string;
}

/** A synthesised group for the dashboard's category view. */
export interface CategoryGroup {
  /** `null` for the trailing "Uncategorised" group. */
  category: Category | null;
  key: string;
  label: string;
  colour: string;
  projects: Project[];
}

/** One row in the recent-issues feed or a search result. */
export interface FeedRow {
  issue: Issue;
  project: Project;
}

export interface SearchResult {
  projects: Project[];
  issues: FeedRow[];
}

export type { Category, Issue, IssueStatus, Project, ProjectLink, Settings, Tag };
export type {
  ProjectSort,
  ViewMode,
} from "./schemas";
