import {
  Timestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import {
  DEFAULT_SETTINGS,
  safeParseCategory,
  safeParseIssue,
  safeParseProject,
  settingsSchema,
  type Category,
  type Issue,
  type Project,
  type Settings,
} from "@/domain";
import { sanitizeLinks } from "./project-links";

/**
 * Firestore stores snake_case fields and `Timestamp` values (spec's data model).
 * These mappers are the only place that shape is known: everything above the
 * Store sees camelCase domain objects with epoch-millisecond timestamps.
 */

const ms = (v: unknown): number | null => {
  if (v instanceof Timestamp) return v.toMillis();
  if (typeof v === "number") return v;
  return null;
};

const msOr = (v: unknown, fallback: number): number => ms(v) ?? fallback;

export function toProject(
  snap: QueryDocumentSnapshot<DocumentData>,
): Project | null {
  const d = snap.data();
  const now = Date.now();
  const parsed = safeParseProject({
    id: snap.id,
    name: d.name,
    categoryId: d.category_id ?? null,
    description: d.description ?? null,
    repoUrl: d.repo_url ?? null,
    websiteUrl: d.website_url ?? null,
    hostMachine: d.host_machine ?? null,
    links: sanitizeLinks(d.links),
    notes: typeof d.notes === "string" ? d.notes : null,
    createdAt: msOr(d.created_at, now),
    updatedAt: msOr(d.updated_at, now),
    deletedAt: ms(d.deleted_at),
  });
  if (!parsed.success) {
    console.warn(`Skipping malformed project ${snap.id}`, parsed.error.issues);
    return null;
  }
  return parsed.data;
}

export function toIssue(
  snap: QueryDocumentSnapshot<DocumentData>,
): Issue | null {
  const d = snap.data();
  const now = Date.now();
  const parsed = safeParseIssue({
    id: snap.id,
    projectId: d.project_id,
    text: d.text,
    tag: d.tag ?? null,
    status: d.status,
    createdAt: msOr(d.created_at, now),
    updatedAt: msOr(d.updated_at, now),
    resolvedAt: ms(d.resolved_at),
    deletedAt: ms(d.deleted_at),
  });
  if (!parsed.success) {
    console.warn(`Skipping malformed issue ${snap.id}`, parsed.error.issues);
    return null;
  }
  return parsed.data;
}

export function toCategory(
  snap: QueryDocumentSnapshot<DocumentData>,
): Category | null {
  const d = snap.data();
  const parsed = safeParseCategory({
    id: snap.id,
    name: d.name,
    colour: d.colour,
    sortOrder: typeof d.sort_order === "number" ? d.sort_order : 0,
  });
  if (!parsed.success) {
    console.warn(`Skipping malformed category ${snap.id}`, parsed.error.issues);
    return null;
  }
  return parsed.data;
}

/**
 * The settings doc is written field-by-field with `{ merge: true }`, so it is
 * routinely partial. Each field falls back to its default independently rather
 * than the whole object reverting when one key is missing.
 */
export function toSettings(data: DocumentData | undefined): Settings {
  const d = data ?? {};
  const candidate = {
    cardsPerPage:
      typeof d.cards_per_page === "number"
        ? d.cards_per_page
        : DEFAULT_SETTINGS.cardsPerPage,
    viewMode:
      d.view_mode === "flat" || d.view_mode === "category"
        ? d.view_mode
        : DEFAULT_SETTINGS.viewMode,
    sortOrder: ["name", "added", "activity"].includes(d.sort_order)
      ? d.sort_order
      : DEFAULT_SETTINGS.sortOrder,
    lastPurgeAt: ms(d.last_purge_at),
  };
  const parsed = settingsSchema.safeParse(candidate);
  return parsed.success ? parsed.data : { ...DEFAULT_SETTINGS };
}

export const settingsToDoc = (s: Partial<Settings>): DocumentData => {
  const out: DocumentData = {};
  if (s.cardsPerPage !== undefined) out.cards_per_page = s.cardsPerPage;
  if (s.viewMode !== undefined) out.view_mode = s.viewMode;
  if (s.sortOrder !== undefined) out.sort_order = s.sortOrder;
  if (s.lastPurgeAt !== undefined) {
    out.last_purge_at = s.lastPurgeAt === null ? null : Timestamp.fromMillis(s.lastPurgeAt);
  }
  return out;
};
