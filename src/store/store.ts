import type {
  Category,
  CategoryPatch,
  Issue,
  IssueStatus,
  NewCategoryInput,
  NewIssueInput,
  NewProjectInput,
  Project,
  ProjectPatch,
  Settings,
  Tag,
} from "@/domain";

/**
 * The Store is the one seam where the whole dataset lives. Everything above it
 * (routes, selectors, ui) is pure and derives its views from a snapshot; nothing
 * above it knows Firestore exists.
 *
 * Two adapters satisfy this interface: `InMemoryStore` (tests, Storybook, the
 * offline demo) and `FirestoreStore` (production). No Firestore type — `Query`,
 * `DocumentReference`, `Timestamp` — is allowed to cross this boundary:
 * timestamps are epoch milliseconds.
 */

export type StoreStatus = "loading" | "ready" | "error";

export interface StoreSnapshot {
  /** Live projects, tombstones removed. */
  readonly projects: readonly Project[];
  /** Live issues, tombstones removed. */
  readonly issues: readonly Issue[];
  /** Categories in `sortOrder`. */
  readonly categories: readonly Category[];
  readonly settings: Settings;
  /** How many soft-deleted issue tombstones exist — drives the Settings purge line. */
  readonly deletedIssueCount: number;
  readonly status: StoreStatus;
  /** Present when `status === "error"`. */
  readonly error?: string;
}

export interface Store {
  /** `useSyncExternalStore` contract: subscribe returns an unsubscribe. */
  subscribe(listener: () => void): () => void;
  /** Must return a referentially stable object while nothing has changed. */
  getSnapshot(): StoreSnapshot;
  /** Detach listeners and release resources. */
  dispose(): void;

  // ---- issues ----
  createIssue(input: NewIssueInput): Promise<string>;
  updateIssueText(id: string, text: string): Promise<void>;
  setIssueTag(id: string, tag: Tag | null): Promise<void>;
  /** The only place `resolvedAt` is written or cleared. */
  setIssueStatus(id: string, status: IssueStatus): Promise<void>;
  /** Soft delete — sets `deletedAt`, hides the issue everywhere. */
  deleteIssue(id: string): Promise<void>;
  /** The only hard delete in the product. Returns how many tombstones were removed. */
  purgeDeletedIssues(): Promise<number>;

  // ---- projects ----
  createProject(input: NewProjectInput): Promise<string>;
  updateProject(id: string, patch: ProjectPatch): Promise<void>;
  deleteProject(id: string): Promise<void>;

  // ---- categories ----
  createCategory(input: NewCategoryInput): Promise<string>;
  updateCategory(id: string, patch: CategoryPatch): Promise<void>;
  /** Reassigns the category's projects to Uncategorised, then removes it. */
  deleteCategory(id: string): Promise<void>;
  /** Sets each category's `sortOrder` to its index in the given list. */
  reorderCategories(orderedIds: readonly string[]): Promise<void>;

  // ---- settings ----
  updateSettings(patch: Partial<Settings>): Promise<void>;
}

export const LOADING_SNAPSHOT: StoreSnapshot = {
  projects: [],
  issues: [],
  categories: [],
  settings: {
    cardsPerPage: 12,
    viewMode: "flat",
    sortOrder: "activity",
    lastPurgeAt: null,
  },
  deletedIssueCount: 0,
  status: "loading",
};
