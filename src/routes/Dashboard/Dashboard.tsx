import { useMemo, useState, type CSSProperties } from "react";
import type { ProjectSort, ViewMode } from "@/domain";
import { useStore, useStoreApi } from "@/store";
import {
  groupByCategory,
  paginate,
  recentOpenIssues,
  relativeTime,
  sortProjects,
} from "@/selectors";
import {
  Eyebrow,
  IssueRow,
  NewProjectTile,
  Pager,
  ProjectCard,
  SegmentedToggle,
  SortMenu,
  Switch,
} from "@/ui";
import styles from "./Dashboard.module.css";

const VIEW_SEGMENTS: ReadonlyArray<{ value: ViewMode; label: string }> = [
  { value: "flat", label: "flat" },
  { value: "category", label: "category" },
];

export function Dashboard() {
  const { projects, issues, categories, settings } = useStore();
  const store = useStoreApi();
  const now = Date.now();

  const [page, setPage] = useState(1);
  const [showResolved, setShowResolved] = useState(false);

  const accentByCategory = useMemo(
    () => new Map(categories.map((c) => [c.id, c.colour])),
    [categories],
  );

  const ordered = useMemo(
    () => sortProjects(projects, issues, settings.sortOrder, now),
    [projects, issues, settings.sortOrder, now],
  );

  const feed = useMemo(
    () => recentOpenIssues(issues, projects, { includeResolved: showResolved }),
    [issues, projects, showResolved],
  );

  const setView = (viewMode: ViewMode) => {
    const apply = () => void store.updateSettings({ viewMode });
    const reduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    // View Transitions morph each card between the flat grid and its bay.
    // Unsupported browsers (and reduced-motion) just swap.
    if (!reduced && typeof document.startViewTransition === "function") {
      document.startViewTransition(apply);
    } else {
      apply();
    }
  };
  const setSort = (sortOrder: ProjectSort) => {
    setPage(1);
    void store.updateSettings({ sortOrder });
  };

  const flat = settings.viewMode === "flat";
  const { slice, pageCount, page: safePage } = paginate(
    ordered,
    settings.cardsPerPage,
    page,
  );
  const groups = groupByCategory(ordered, categories);

  return (
    <div className={styles.page}>
      <section className={styles.projects}>
        <header className={styles.sectionHead}>
          <Eyebrow>projects</Eyebrow>
          <div className={styles.controls}>
            <SegmentedToggle
              segments={VIEW_SEGMENTS}
              value={settings.viewMode}
              onChange={setView}
              label="Project view"
            />
            <SortMenu value={settings.sortOrder} onChange={setSort} />
          </div>
        </header>

        {projects.length === 0 ? (
          <div className={styles.emptyProjects}>
            <p className={styles.empty}>
              No projects yet. Create one to start filing ideas.
            </p>
            <div className={styles.grid}>
              <NewProjectTile />
            </div>
          </div>
        ) : flat ? (
          <>
            <div className={styles.grid}>
              <NewProjectTile />
              {slice.map((p, i) => (
                <ProjectCard
                  key={p.id}
                  name={p.name}
                  to={`/project/${p.id}`}
                  index={i}
                  transitionName={`card-${p.id}`}
                  accent={
                    p.categoryId
                      ? accentByCategory.get(p.categoryId) ?? null
                      : null
                  }
                  repoHost={hostLabel(p.repoUrl)}
                  hostMachine={p.hostMachine}
                />
              ))}
            </div>
            {pageCount > 1 ? (
              <div className={styles.pagerRow}>
                <Pager
                  page={safePage}
                  pageCount={pageCount}
                  onChange={setPage}
                />
              </div>
            ) : null}
          </>
        ) : (
          <div className={styles.bays}>
            <div className={styles.newTileRow}>
              <NewProjectTile />
            </div>
            {groups.map((group) => (
              <section
                key={group.key}
                className={styles.bay}
                aria-label={group.label}
                style={{ "--bay-accent": group.colour } as CSSProperties}
              >
                <span className={styles.bayTab}>{group.label}</span>
                {group.projects.length === 0 ? (
                  <p className={styles.bayEmpty}>No projects</p>
                ) : (
                  <div className={styles.grid}>
                    {group.projects.map((p, i) => (
                      <ProjectCard
                        key={p.id}
                        name={p.name}
                        to={`/project/${p.id}`}
                        index={i}
                        transitionName={`card-${p.id}`}
                        repoHost={hostLabel(p.repoUrl)}
                        hostMachine={p.hostMachine}
                      />
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </section>

      <hr className={styles.divider} />

      <section className={styles.feed}>
        <header className={styles.sectionHead}>
          <Eyebrow>recent · open issues · all projects</Eyebrow>
          <Switch
            checked={showResolved}
            onChange={setShowResolved}
            label="show resolved"
          />
        </header>

        {feed.length === 0 ? (
          <p className={styles.empty}>
            {showResolved
              ? "No issues filed yet."
              : "Nothing open. Every idea you've filed is done or dismissed."}
          </p>
        ) : (
          <ul className={styles.rows}>
            {feed.map(({ issue, project }) => (
              <li key={issue.id}>
                <IssueRow
                  text={issue.text}
                  status={issue.status}
                  tag={issue.tag}
                  timeLabel={relativeTime(issue.createdAt, now)}
                  projectName={project.name}
                  to={`/project/${project.id}`}
                  attachments={issue.attachments}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function hostLabel(repoUrl: string | null): string | null {
  if (!repoUrl) return null;
  try {
    return new URL(repoUrl).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
