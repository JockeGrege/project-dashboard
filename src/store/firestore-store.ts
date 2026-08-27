import {
  Timestamp,
  collection,
  doc,
  getFirestore,
  onSnapshot,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentData,
  type Firestore,
  type QueryDocumentSnapshot,
  type UpdateData,
} from "firebase/firestore";
import {
  DEFAULT_CATEGORY_COLOUR,
  DEFAULT_SETTINGS,
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
import type { Store, StoreSnapshot, StoreStatus } from "./store";
import {
  settingsToDoc,
  toCategory,
  toIssue,
  toProject,
  toSettings,
} from "./firestore-mappers";

const COL = {
  projects: "projects",
  issues: "issues",
  categories: "categories",
} as const;
const SETTINGS_DOC = ["meta", "settings"] as const;

type LoadKey = "projects" | "issues" | "categories" | "settings";

/**
 * The production adapter. Holds the whole dataset in memory from four snapshot
 * listeners and derives nothing itself — selectors do that. Every rule the spec
 * defends (`resolvedAt` only in `setIssueStatus`, soft delete, one hard-delete
 * path, category reassignment on delete) lives here, mirrored from `InMemoryStore`.
 */
export class FirestoreStore implements Store {
  private db: Firestore;

  private projects = new Map<string, Project>();
  private issues = new Map<string, Issue>();
  private categories = new Map<string, Category>();
  private settings: Settings = { ...DEFAULT_SETTINGS };

  private loaded = { projects: false, issues: false, categories: false, settings: false };
  private status: StoreStatus = "loading";
  private errorText: string | undefined;

  private listeners = new Set<() => void>();
  private unsubs: Array<() => void> = [];
  private snapshot: StoreSnapshot;
  private dirty = true;

  constructor(db?: Firestore) {
    this.db = db ?? getFirestore();
    this.snapshot = this.build();
    this.attach();
  }

  // ---- useSyncExternalStore ----

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
    this.unsubs.forEach((u) => u());
    this.unsubs = [];
    this.listeners.clear();
  };

  private attach(): void {
    const onErr = (where: string) => (err: unknown) => {
      this.status = "error";
      this.errorText = `Lost the connection to ${where}. ${
        err instanceof Error ? err.message : ""
      }`.trim();
      this.commit();
    };

    this.unsubs.push(
      onSnapshot(
        collection(this.db, COL.projects),
        (snap) => {
          this.projects = mapById(snap.docs, toProject);
          this.markLoaded("projects");
        },
        onErr("projects"),
      ),
      onSnapshot(
        collection(this.db, COL.issues),
        (snap) => {
          this.issues = mapById(snap.docs, toIssue);
          this.markLoaded("issues");
        },
        onErr("issues"),
      ),
      onSnapshot(
        collection(this.db, COL.categories),
        (snap) => {
          this.categories = mapById(snap.docs, toCategory);
          this.markLoaded("categories");
        },
        onErr("categories"),
      ),
      onSnapshot(
        doc(this.db, SETTINGS_DOC[0], SETTINGS_DOC[1]),
        (snap) => {
          this.settings = toSettings(snap.data());
          this.markLoaded("settings");
        },
        onErr("settings"),
      ),
    );
  }

  private markLoaded(key: LoadKey): void {
    this.loaded[key] = true;
    if (this.status !== "error" && Object.values(this.loaded).every(Boolean)) {
      this.status = "ready";
    }
    this.commit();
  }

  private commit(): void {
    this.dirty = true;
    for (const l of this.listeners) l();
  }

  private build(): StoreSnapshot {
    return {
      projects: [...this.projects.values()].filter((p) => p.deletedAt === null),
      issues: [...this.issues.values()].filter((i) => i.deletedAt === null),
      categories: [...this.categories.values()].sort(
        (a, b) => a.sortOrder - b.sortOrder,
      ),
      settings: this.settings,
      status: this.status,
      ...(this.errorText ? { error: this.errorText } : {}),
    };
  }

  private newRef(col: keyof typeof COL) {
    return doc(collection(this.db, COL[col]));
  }

  // ---- issues ----

  createIssue = async (input: NewIssueInput): Promise<string> => {
    const ref = this.newRef("issues");
    const nowTs = Timestamp.now();
    await setDoc(ref, {
      project_id: input.projectId,
      text: input.text.trim(),
      tag: input.tag,
      status: "open",
      created_at: nowTs,
      updated_at: nowTs,
      resolved_at: null,
      deleted_at: null,
    });
    return ref.id;
  };

  updateIssueText = async (id: string, text: string): Promise<void> => {
    await updateDoc(doc(this.db, COL.issues, id), {
      text: text.trim(),
      updated_at: Timestamp.now(),
    });
  };

  setIssueTag = async (id: string, tag: Tag | null): Promise<void> => {
    await updateDoc(doc(this.db, COL.issues, id), {
      tag,
      updated_at: Timestamp.now(),
    });
  };

  setIssueStatus = async (id: string, status: IssueStatus): Promise<void> => {
    const current = this.issues.get(id);
    const nowTs = Timestamp.now();
    const patch: UpdateData<DocumentData> = { status, updated_at: nowTs };
    if (status === "open") {
      patch.resolved_at = null;
    } else if (!current || current.status === "open") {
      patch.resolved_at = nowTs;
    }
    await updateDoc(doc(this.db, COL.issues, id), patch);
  };

  deleteIssue = async (id: string): Promise<void> => {
    const nowTs = Timestamp.now();
    await updateDoc(doc(this.db, COL.issues, id), {
      deleted_at: nowTs,
      updated_at: nowTs,
    });
  };

  purgeDeletedIssues = async (): Promise<number> => {
    const tombstones = [...this.issues.values()].filter(
      (i) => i.deletedAt !== null,
    );
    for (let i = 0; i < tombstones.length; i += 400) {
      const batch = writeBatch(this.db);
      for (const issue of tombstones.slice(i, i + 400)) {
        batch.delete(doc(this.db, COL.issues, issue.id));
      }
      await batch.commit();
    }
    await setDoc(
      doc(this.db, SETTINGS_DOC[0], SETTINGS_DOC[1]),
      { last_purge_at: Timestamp.now() },
      { merge: true },
    );
    return tombstones.length;
  };

  // ---- projects ----

  createProject = async (input: NewProjectInput): Promise<string> => {
    const batch = writeBatch(this.db);
    const projectRef = this.newRef("projects");
    const nowTs = Timestamp.now();
    batch.set(projectRef, {
      name: input.name.trim(),
      category_id: input.categoryId,
      repo_url: input.repoUrl?.trim() ? input.repoUrl.trim() : null,
      host_machine: input.hostMachine?.trim() ? input.hostMachine.trim() : null,
      created_at: nowTs,
      updated_at: nowTs,
      deleted_at: null,
    });

    if (input.firstIssue && input.firstIssue.text.trim()) {
      batch.set(this.newRef("issues"), {
        project_id: projectRef.id,
        text: input.firstIssue.text.trim(),
        tag: input.firstIssue.tag,
        status: "open",
        created_at: nowTs,
        updated_at: nowTs,
        resolved_at: null,
        deleted_at: null,
      });
    }

    await batch.commit();
    return projectRef.id;
  };

  updateProject = async (id: string, patch: ProjectPatch): Promise<void> => {
    const out: UpdateData<DocumentData> = { updated_at: Timestamp.now() };
    if (patch.name !== undefined) out.name = patch.name.trim();
    if (patch.categoryId !== undefined) out.category_id = patch.categoryId;
    if (patch.repoUrl !== undefined) {
      out.repo_url = patch.repoUrl?.trim() ? patch.repoUrl.trim() : null;
    }
    if (patch.hostMachine !== undefined) {
      out.host_machine = patch.hostMachine?.trim() ? patch.hostMachine.trim() : null;
    }
    await updateDoc(doc(this.db, COL.projects, id), out);
  };

  deleteProject = async (id: string): Promise<void> => {
    const nowTs = Timestamp.now();
    const batch = writeBatch(this.db);
    batch.update(doc(this.db, COL.projects, id), {
      deleted_at: nowTs,
      updated_at: nowTs,
    });
    for (const issue of this.issues.values()) {
      if (issue.projectId === id && issue.deletedAt === null) {
        batch.update(doc(this.db, COL.issues, issue.id), {
          deleted_at: nowTs,
          updated_at: nowTs,
        });
      }
    }
    await batch.commit();
  };

  // ---- categories ----

  createCategory = async (input: NewCategoryInput): Promise<string> => {
    const colour = isCategoryColour(input.colour)
      ? input.colour
      : DEFAULT_CATEGORY_COLOUR;
    const nextOrder =
      [...this.categories.values()].reduce(
        (max, c) => Math.max(max, c.sortOrder),
        -1,
      ) + 1;
    const ref = this.newRef("categories");
    await setDoc(ref, {
      name: input.name.trim(),
      colour,
      sort_order: nextOrder,
    });
    return ref.id;
  };

  updateCategory = async (id: string, patch: CategoryPatch): Promise<void> => {
    const out: UpdateData<DocumentData> = {};
    if (patch.name !== undefined) out.name = patch.name.trim();
    if (patch.colour !== undefined && isCategoryColour(patch.colour)) {
      out.colour = patch.colour;
    }
    if (Object.keys(out).length > 0) {
      await updateDoc(doc(this.db, COL.categories, id), out);
    }
  };

  deleteCategory = async (id: string): Promise<void> => {
    const batch = writeBatch(this.db);
    const nowTs = Timestamp.now();
    for (const project of this.projects.values()) {
      if (project.categoryId === id) {
        batch.update(doc(this.db, COL.projects, project.id), {
          category_id: null,
          updated_at: nowTs,
        });
      }
    }
    batch.delete(doc(this.db, COL.categories, id));
    await batch.commit();
  };

  reorderCategories = async (orderedIds: readonly string[]): Promise<void> => {
    const batch = writeBatch(this.db);
    orderedIds.forEach((cid, index) => {
      batch.update(doc(this.db, COL.categories, cid), { sort_order: index });
    });
    await batch.commit();
  };

  // ---- settings ----

  updateSettings = async (patch: Partial<Settings>): Promise<void> => {
    await setDoc(
      doc(this.db, SETTINGS_DOC[0], SETTINGS_DOC[1]),
      settingsToDoc(patch),
      { merge: true },
    );
  };
}

function mapById<T extends { id: string }>(
  docs: Array<QueryDocumentSnapshot<DocumentData>>,
  map: (snap: QueryDocumentSnapshot<DocumentData>) => T | null,
): Map<string, T> {
  const out = new Map<string, T>();
  for (const snap of docs) {
    const value = map(snap);
    if (value) out.set(value.id, value);
  }
  return out;
}
