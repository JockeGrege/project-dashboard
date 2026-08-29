import {
  DEFAULT_CATEGORY_COLOUR,
  DEFAULT_SETTINGS,
  MAX_NOTES_LENGTH,
  isCategoryColour,
  type Category,
  type CategoryPatch,
  type Issue,
  type IssueStatus,
  type NewCategoryInput,
  type NewIssueInput,
  type NewProjectInput,
  type Project,
  type ProjectPatch,
  type Settings,
  type Tag,
} from "@/domain";
import type { Store, StoreSnapshot } from "./store";
import { normaliseText, sanitizeLinks } from "./project-links";
import { sanitizeImageUrls } from "./attachments";

export interface InMemorySeed {
  projects?: Project[];
  issues?: Issue[];
  categories?: Category[];
  settings?: Partial<Settings>;
}

export interface InMemoryStoreOptions {
  seed?: InMemorySeed;
  /** Injected clock — tests freeze it; production passes `Date.now`. */
  now?: () => number;
  /** Injected id factory — tests make it deterministic. */
  newId?: () => string;
  /** Simulated async latency in ms; 0 resolves on a microtask. */
  latencyMs?: number;
}

const clone = <T>(v: T): T =>
  typeof structuredClone === "function"
    ? structuredClone(v)
    : (JSON.parse(JSON.stringify(v)) as T);

const trimmedOrThrow = (value: string, field: string): string => {
  const t = value.trim();
  if (t.length === 0) throw new Error(`${field} can't be empty.`);
  return t;
};

/**
 * The full dataset in memory, behind the Store interface. Deep by design: every
 * rule the spec argues for — `resolvedAt` bookkeeping, soft delete, the single
 * hard-delete path, category reassignment on delete — lives here and nowhere
 * else. Tests exercise all of it through the same interface routes use.
 *
 * Every mutation is `async` so input validation surfaces as a rejected promise,
 * matching how the Firestore adapter will behave.
 */
export class InMemoryStore implements Store {
  private projects: Project[];
  private issues: Issue[];
  private categories: Category[];
  private settings: Settings;

  private readonly clock: () => number;
  private readonly nextId: () => string;
  private readonly latencyMs: number;

  private listeners = new Set<() => void>();
  private snapshot: StoreSnapshot;
  private dirty = true;

  constructor(options: InMemoryStoreOptions = {}) {
    this.clock = options.now ?? (() => Date.now());
    this.nextId =
      options.newId ??
      (() =>
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `id_${Math.random().toString(36).slice(2)}`);
    this.latencyMs = options.latencyMs ?? 0;

    const seed = options.seed ?? {};
    this.projects = clone(seed.projects ?? []);
    this.issues = clone(seed.issues ?? []);
    this.categories = clone(seed.categories ?? []);
    this.settings = { ...DEFAULT_SETTINGS, ...seed.settings };
    this.snapshot = this.build();
  }

  // ---- useSyncExternalStore contract ----

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): StoreSnapshot => {
    if (this.dirty) {
      this.snapshot = this.build();
      this.dirty = false;
    }
    return this.snapshot;
  };

  dispose = (): void => {
    this.listeners.clear();
  };

  private build(): StoreSnapshot {
    return {
      projects: this.projects.filter((p) => p.deletedAt === null).map(clone),
      issues: this.issues.filter((i) => i.deletedAt === null).map(clone),
      categories: [...this.categories]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(clone),
      settings: { ...this.settings },
      deletedIssueCount: this.issues.reduce(
        (n, i) => (i.deletedAt !== null ? n + 1 : n),
        0,
      ),
      status: "ready",
    };
  }

  private commit(): void {
    this.dirty = true;
    for (const l of this.listeners) l();
  }

  private async delay(): Promise<void> {
    if (this.latencyMs > 0) {
      await new Promise((r) => setTimeout(r, this.latencyMs));
    }
  }

  private issueOrThrow(id: string): Issue {
    const issue = this.issues.find((i) => i.id === id);
    if (!issue || issue.deletedAt !== null) {
      throw new Error(`No issue with id ${id}.`);
    }
    return issue;
  }

  private projectOrThrow(id: string): Project {
    const project = this.projects.find((p) => p.id === id);
    if (!project || project.deletedAt !== null) {
      throw new Error(`No project with id ${id}.`);
    }
    return project;
  }

  private categoryOrThrow(id: string): Category {
    const category = this.categories.find((c) => c.id === id);
    if (!category) throw new Error(`No category with id ${id}.`);
    return category;
  }

  // ---- issues ----

  createIssue = async (input: NewIssueInput): Promise<string> => {
    this.projectOrThrow(input.projectId);
    const ts = this.clock();
    const issue: Issue = {
      id: this.nextId(),
      projectId: input.projectId,
      text: trimmedOrThrow(input.text, "Issue text"),
      tag: input.tag,
      status: "open",
      attachments: sanitizeImageUrls(input.attachments ?? []),
      createdAt: ts,
      updatedAt: ts,
      resolvedAt: null,
      deletedAt: null,
    };
    this.issues.push(issue);
    this.commit();
    await this.delay();
    return issue.id;
  };

  updateIssueText = async (id: string, text: string): Promise<void> => {
    const issue = this.issueOrThrow(id);
    issue.text = trimmedOrThrow(text, "Issue text");
    issue.updatedAt = this.clock();
    this.commit();
    await this.delay();
  };

  setIssueTag = async (id: string, tag: Tag | null): Promise<void> => {
    const issue = this.issueOrThrow(id);
    issue.tag = tag;
    issue.updatedAt = this.clock();
    this.commit();
    await this.delay();
  };

  setIssueStatus = async (id: string, status: IssueStatus): Promise<void> => {
    const issue = this.issueOrThrow(id);
    const ts = this.clock();
    if (status === "open") {
      issue.resolvedAt = null;
    } else if (issue.status === "open") {
      issue.resolvedAt = ts;
    }
    issue.status = status;
    issue.updatedAt = ts;
    this.commit();
    await this.delay();
  };

  deleteIssue = async (id: string): Promise<void> => {
    const issue = this.issueOrThrow(id);
    issue.deletedAt = this.clock();
    issue.updatedAt = issue.deletedAt;
    this.commit();
    await this.delay();
  };

  purgeDeletedIssues = async (): Promise<number> => {
    const before = this.issues.length;
    this.issues = this.issues.filter((i) => i.deletedAt === null);
    const removed = before - this.issues.length;
    this.settings = { ...this.settings, lastPurgeAt: this.clock() };
    this.commit();
    await this.delay();
    return removed;
  };

  // ---- projects ----

  createProject = async (input: NewProjectInput): Promise<string> => {
    if (input.categoryId !== null) this.categoryOrThrow(input.categoryId);
    const ts = this.clock();
    const project: Project = {
      id: this.nextId(),
      name: trimmedOrThrow(input.name, "Project name"),
      categoryId: input.categoryId,
      description: normaliseText(input.description, 280),
      repoUrl: input.repoUrl?.trim() ? input.repoUrl.trim() : null,
      websiteUrl: input.websiteUrl?.trim() ? input.websiteUrl.trim() : null,
      hostMachine: input.hostMachine?.trim() ? input.hostMachine.trim() : null,
      links: [],
      notes: null,
      createdAt: ts,
      updatedAt: ts,
      deletedAt: null,
    };
    this.projects.push(project);

    if (input.firstIssue && input.firstIssue.text.trim()) {
      this.issues.push({
        id: this.nextId(),
        projectId: project.id,
        text: input.firstIssue.text.trim(),
        tag: input.firstIssue.tag,
        status: "open",
        attachments: [],
        createdAt: ts,
        updatedAt: ts,
        resolvedAt: null,
        deletedAt: null,
      });
    }

    this.commit();
    await this.delay();
    return project.id;
  };

  updateProject = async (id: string, patch: ProjectPatch): Promise<void> => {
    const project = this.projectOrThrow(id);
    if (patch.name !== undefined) {
      project.name = trimmedOrThrow(patch.name, "Project name");
    }
    if (patch.categoryId !== undefined) {
      if (patch.categoryId !== null) this.categoryOrThrow(patch.categoryId);
      project.categoryId = patch.categoryId;
    }
    if (patch.description !== undefined) {
      project.description = normaliseText(patch.description, 280);
    }
    if (patch.repoUrl !== undefined) {
      project.repoUrl = patch.repoUrl?.trim() ? patch.repoUrl.trim() : null;
    }
    if (patch.websiteUrl !== undefined) {
      project.websiteUrl = patch.websiteUrl?.trim()
        ? patch.websiteUrl.trim()
        : null;
    }
    if (patch.hostMachine !== undefined) {
      project.hostMachine = patch.hostMachine?.trim()
        ? patch.hostMachine.trim()
        : null;
    }
    if (patch.links !== undefined) {
      project.links = sanitizeLinks(patch.links);
    }
    if (patch.notes !== undefined) {
      project.notes = normaliseText(patch.notes, MAX_NOTES_LENGTH);
    }
    project.updatedAt = this.clock();
    this.commit();
    await this.delay();
  };

  deleteProject = async (id: string): Promise<void> => {
    const project = this.projectOrThrow(id);
    const ts = this.clock();
    project.deletedAt = ts;
    project.updatedAt = ts;
    // Cascade: tombstone the project's issues so they leave the feed too.
    for (const issue of this.issues) {
      if (issue.projectId === id && issue.deletedAt === null) {
        issue.deletedAt = ts;
        issue.updatedAt = ts;
      }
    }
    this.commit();
    await this.delay();
  };

  // ---- categories ----

  createCategory = async (input: NewCategoryInput): Promise<string> => {
    const colour = isCategoryColour(input.colour)
      ? input.colour
      : DEFAULT_CATEGORY_COLOUR;
    const nextOrder =
      this.categories.reduce((max, c) => Math.max(max, c.sortOrder), -1) + 1;
    const category: Category = {
      id: this.nextId(),
      name: trimmedOrThrow(input.name, "Category name"),
      colour,
      sortOrder: nextOrder,
    };
    this.categories.push(category);
    this.commit();
    await this.delay();
    return category.id;
  };

  updateCategory = async (id: string, patch: CategoryPatch): Promise<void> => {
    const category = this.categoryOrThrow(id);
    if (patch.name !== undefined) {
      category.name = trimmedOrThrow(patch.name, "Category name");
    }
    if (patch.colour !== undefined && isCategoryColour(patch.colour)) {
      category.colour = patch.colour;
    }
    this.commit();
    await this.delay();
  };

  deleteCategory = async (id: string): Promise<void> => {
    this.categoryOrThrow(id);
    const ts = this.clock();
    for (const project of this.projects) {
      if (project.categoryId === id) {
        project.categoryId = null;
        project.updatedAt = ts;
      }
    }
    this.categories = this.categories.filter((c) => c.id !== id);
    this.commit();
    await this.delay();
  };

  reorderCategories = async (orderedIds: readonly string[]): Promise<void> => {
    const index = new Map(orderedIds.map((cid, i) => [cid, i] as const));
    for (const category of this.categories) {
      const next = index.get(category.id);
      if (next !== undefined) category.sortOrder = next;
    }
    this.commit();
    await this.delay();
  };

  // ---- settings ----

  updateSettings = async (patch: Partial<Settings>): Promise<void> => {
    this.settings = { ...this.settings, ...patch };
    this.commit();
    await this.delay();
  };
}

export const createInMemoryStore = (
  options?: InMemoryStoreOptions,
): InMemoryStore => new InMemoryStore(options);
