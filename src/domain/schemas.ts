import { z } from "zod";

/**
 * Zod schemas describe a *valid entity* in its in-memory (domain) shape:
 * camelCase keys, timestamps as epoch milliseconds. The Firestore adapter is
 * responsible for renaming snake_case doc fields and converting `Timestamp`
 * values to millis *before* handing data to these schemas — so this is the one
 * gate every record passes through, whichever adapter produced it.
 *
 * Domain TS types are inferred from these schemas (`z.infer`) so there is a
 * single source of truth.
 */

export const TAGS = ["bug", "enhancement", "documentation", "question"] as const;
export const tagSchema = z.enum(TAGS);
export type Tag = z.infer<typeof tagSchema>;

export const ISSUE_STATUSES = ["open", "done", "dismissed"] as const;
export const issueStatusSchema = z.enum(ISSUE_STATUSES);
export type IssueStatus = z.infer<typeof issueStatusSchema>;

export const PROJECT_SORTS = ["name", "added", "activity"] as const;
export const projectSortSchema = z.enum(PROJECT_SORTS);
export type ProjectSort = z.infer<typeof projectSortSchema>;

export const VIEW_MODES = ["flat", "category"] as const;
export const viewModeSchema = z.enum(VIEW_MODES);
export type ViewMode = z.infer<typeof viewModeSchema>;

const epochMillis = z.number().int().nonnegative();
const nonEmpty = z.string().trim().min(1);

/**
 * One free-form link on a project — a Firebase console, a deploy dashboard, a
 * maintenance doc. The two first-class URLs below (`repoUrl`, `websiteUrl`) stay
 * scalar because they're asked for by name everywhere; anything else the owner
 * wants to keep close goes here.
 */
export const projectLinkSchema = z.object({
  label: nonEmpty.max(80),
  url: z.string().trim().url(),
});
export type ProjectLink = z.infer<typeof projectLinkSchema>;

/**
 * Cap on the maintenance-notes Markdown blob. `notes` is stored inline on the
 * project document, so this keeps a single doc comfortably under Firestore's
 * 1 MiB ceiling while still fitting a full runbook (~400 KB of text).
 */
export const MAX_NOTES_LENGTH = 400_000;

export const projectSchema = z.object({
  id: nonEmpty,
  name: nonEmpty,
  categoryId: z.string().min(1).nullable(),
  /** A one-line summary shown under the project name. */
  description: z.string().trim().max(280).nullable(),
  /** Where the code is hosted. */
  repoUrl: z.string().trim().url().nullable(),
  /** The live / deployed site, if there is one. */
  websiteUrl: z.string().trim().url().nullable(),
  /** Which machine the project was made on. */
  hostMachine: z.string().trim().min(1).nullable(),
  /** Arbitrary extra links — Firebase console, deploy board, runbooks. */
  links: z.array(projectLinkSchema).max(40),
  /** Long-form Markdown: a maintenance guide, setup notes, gotchas. */
  notes: z.string().max(MAX_NOTES_LENGTH).nullable(),
  createdAt: epochMillis,
  updatedAt: epochMillis,
  deletedAt: epochMillis.nullable(),
});
export type Project = z.infer<typeof projectSchema>;

/** How many images one issue may carry. Keeps a runaway paste from ballooning a doc. */
export const MAX_ATTACHMENTS = 8;

export const issueSchema = z.object({
  id: nonEmpty,
  projectId: nonEmpty,
  text: nonEmpty,
  tag: tagSchema.nullable(),
  status: issueStatusSchema,
  /**
   * Hosted image URLs (imgbb), in paste order. The image bytes live off-Firebase;
   * only the URL is stored. Absent on every issue filed before this shipped, hence
   * the default.
   */
  attachments: z.array(z.string().trim().url()).max(MAX_ATTACHMENTS).default([]),
  createdAt: epochMillis,
  updatedAt: epochMillis,
  /** When the issue left `open`, whichever way it went. `status` says which. */
  resolvedAt: epochMillis.nullable(),
  /** Soft delete. Tombstones sync so the cache can learn of removals; filtered in memory. */
  deletedAt: epochMillis.nullable(),
});
export type Issue = z.infer<typeof issueSchema>;

export const categorySchema = z.object({
  id: nonEmpty,
  name: nonEmpty,
  colour: nonEmpty,
  sortOrder: z.number().int(),
});
export type Category = z.infer<typeof categorySchema>;

export const settingsSchema = z.object({
  cardsPerPage: z.number().int().min(1).max(64),
  viewMode: viewModeSchema,
  sortOrder: projectSortSchema,
  lastPurgeAt: epochMillis.nullable(),
});
export type Settings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  cardsPerPage: 12,
  viewMode: "flat",
  sortOrder: "activity",
  lastPurgeAt: null,
};

/** Parse-or-throw helpers, used by adapters at the seam. */
export const parseProject = (v: unknown): Project => projectSchema.parse(v);
export const parseIssue = (v: unknown): Issue => issueSchema.parse(v);
export const parseCategory = (v: unknown): Category => categorySchema.parse(v);
export const parseSettings = (v: unknown): Settings => settingsSchema.parse(v);

/** Non-throwing variants for the sync path, where one bad doc must not blank the app. */
export const safeParseProject = (v: unknown) => projectSchema.safeParse(v);
export const safeParseIssue = (v: unknown) => issueSchema.safeParse(v);
export const safeParseCategory = (v: unknown) => categorySchema.safeParse(v);
