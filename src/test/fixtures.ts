import type { Category, Issue, Project } from "@/domain";
import { createInMemoryStore, type InMemorySeed } from "@/store";

/** A fixed clock for deterministic tests. Thu 28 Aug 2026, 12:00 UTC. */
export const NOW = Date.UTC(2026, 7, 28, 12, 0, 0);

export const minutesAgo = (n: number) => NOW - n * 60_000;
export const hoursAgo = (n: number) => NOW - n * 3_600_000;
export const daysAgo = (n: number) => NOW - n * 86_400_000;

export const CATEGORIES: Category[] = [
  { id: "cat_work", name: "Work", colour: "#6fae82", sortOrder: 0 },
  { id: "cat_personal", name: "Personal", colour: "#8e8ad9", sortOrder: 1 },
  { id: "cat_fun", name: "For fun", colour: "#c98a6b", sortOrder: 2 },
];

export const PROJECTS: Project[] = [
  mkProject("prj_dashboard", "dashboard", "cat_work", daysAgo(120), {
    repoUrl: "https://github.com/me/dashboard",
    hostMachine: "macbook-pro",
  }),
  mkProject("prj_core", "core", "cat_work", daysAgo(90)),
  mkProject("prj_sync", "sync", "cat_work", daysAgo(40)),
  mkProject("prj_pdfkit", "pdfkit", "cat_personal", daysAgo(200)),
  mkProject("prj_notes", "notes", "cat_personal", daysAgo(15)),
  mkProject("prj_quiz", "quiz", "cat_fun", daysAgo(60)),
  mkProject("prj_mixer", "mixer", "cat_fun", daysAgo(8)),
  mkProject("prj_lab", "lab", null, daysAgo(3)),
];

export const ISSUES: Issue[] = [
  mkIssue("iss_01", "prj_core", "swap the auth guard for a hook", "enhancement", "open", hoursAgo(2)),
  mkIssue("iss_02", "prj_dashboard", "favicon 404s on deep links", "bug", "open", daysAgo(1)),
  mkIssue("iss_03", "prj_mixer", "document the seed script", "documentation", "open", daysAgo(3)),
  mkIssue("iss_04", "prj_dashboard", "do we even need the pager?", "question", "open", daysAgo(4)),
  mkIssue("iss_05", "prj_core", "set up the emulator suite", "enhancement", "done", daysAgo(7), daysAgo(5)),
  mkIssue("iss_06", "prj_core", "rewrite in rust", null, "dismissed", daysAgo(12), daysAgo(9)),
  mkIssue("iss_07", "prj_sync", "retry backoff is too aggressive", "bug", "open", daysAgo(2)),
  mkIssue("iss_08", "prj_sync", "add a changelog", "documentation", "open", daysAgo(6)),
  mkIssue("iss_09", "prj_quiz", "shuffle answers per render", "bug", "open", daysAgo(9)),
  mkIssue("iss_10", "prj_quiz", "dark mode", "enhancement", "dismissed", daysAgo(30), daysAgo(20)),
  mkIssue("iss_11", "prj_pdfkit", "kerning tables are stale", null, "open", daysAgo(11)),
  mkIssue("iss_12", "prj_pdfkit", "ship the CLI", "enhancement", "done", daysAgo(45), daysAgo(40)),
  mkIssue("iss_13", "prj_notes", "sync conflict banner wording", "enhancement", "open", hoursAgo(20)),
  mkIssue("iss_14", "prj_notes", "export to markdown", "enhancement", "open", daysAgo(5)),
  mkIssue("iss_15", "prj_dashboard", "the sort dropdown loses focus on Esc", "bug", "open", daysAgo(2)),
  mkIssue("iss_16", "prj_mixer", "gain staging clips at -3dB", "bug", "open", daysAgo(1)),
  mkIssue("iss_17", "prj_lab", "try the new router", "question", "open", daysAgo(3)),
  mkIssue("iss_18", "prj_core", "profile the cold start", null, "open", daysAgo(8)),
  mkIssue("iss_19", "prj_quiz", "leaderboard page", "enhancement", "open", daysAgo(14)),
  mkIssue("iss_20", "prj_pdfkit", "old typo fix", "documentation", "done", daysAgo(3), daysAgo(1)),
];

export const SEED: InMemorySeed = {
  categories: CATEGORIES,
  projects: PROJECTS,
  issues: ISSUES,
  settings: { cardsPerPage: 6 },
};

/** A store preloaded with the fixture data and a frozen clock. */
export const makeSeededStore = (overrides?: Partial<InMemorySeed>) => {
  let counter = 0;
  return createInMemoryStore({
    seed: { ...SEED, ...overrides },
    now: () => NOW,
    newId: () => `gen_${++counter}`,
  });
};

function mkProject(
  id: string,
  name: string,
  categoryId: string | null,
  createdAt: number,
  extra: Partial<Pick<Project, "repoUrl" | "hostMachine">> = {},
): Project {
  return {
    id,
    name,
    categoryId,
    repoUrl: extra.repoUrl ?? null,
    hostMachine: extra.hostMachine ?? null,
    createdAt,
    updatedAt: createdAt,
    deletedAt: null,
  };
}

function mkIssue(
  id: string,
  projectId: string,
  text: string,
  tag: Issue["tag"],
  status: Issue["status"],
  createdAt: number,
  resolvedAt: number | null = null,
): Issue {
  return {
    id,
    projectId,
    text,
    tag,
    status,
    createdAt,
    updatedAt: resolvedAt ?? createdAt,
    resolvedAt: status === "open" ? null : resolvedAt,
    deletedAt: null,
  };
}
