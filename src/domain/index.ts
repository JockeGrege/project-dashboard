export {
  TAGS,
  ISSUE_STATUSES,
  PROJECT_SORTS,
  VIEW_MODES,
  MAX_ATTACHMENTS,
  MAX_NOTES_LENGTH,
  DEFAULT_SETTINGS,
  tagSchema,
  issueStatusSchema,
  projectSortSchema,
  viewModeSchema,
  projectSchema,
  projectLinkSchema,
  issueSchema,
  categorySchema,
  settingsSchema,
  parseProject,
  parseIssue,
  parseCategory,
  parseSettings,
  safeParseProject,
  safeParseIssue,
  safeParseCategory,
} from "./schemas";
export type {
  Tag,
  IssueStatus,
  ProjectSort,
  ViewMode,
  Project,
  ProjectLink,
  Issue,
  Category,
  Settings,
} from "./schemas";

export {
  TAG_META,
  TAG_LIST,
  isTag,
  CATEGORY_COLOURS,
  DEFAULT_CATEGORY_COLOUR,
  isCategoryColour,
} from "./tags";
export type { TagMeta, TagFilter, CategoryColour } from "./tags";

export type {
  NewIssueInput,
  NewProjectInput,
  ProjectPatch,
  NewCategoryInput,
  CategoryPatch,
  CategoryGroup,
  FeedRow,
  SearchResult,
} from "./types";

export const UNCATEGORISED_KEY = "__uncategorised__";
