import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { IssueStatus, TagFilter } from "@/domain";
import { TAG_LIST } from "@/domain";
import { useStore, useStoreApi } from "@/store";
import { useToast } from "@/app/toast-context";
import { filterProjectIssues } from "@/selectors";
import { ConfirmDialog, ExternalLink, LinkText, MonogramAvatar } from "@/ui";
import { IssueComposer } from "./IssueComposer";
import { IssueListRow } from "./IssueListRow";
import { ProjectMetaEditor } from "./ProjectMetaEditor";
import { ProjectDetailsPanel } from "./ProjectDetailsPanel";
import styles from "./ProjectDetail.module.css";

const TAG_FILTERS: ReadonlyArray<{ value: TagFilter; label: string }> = [
  { value: "all", label: "all" },
  ...TAG_LIST.map((m) => ({ value: m.tag as TagFilter, label: m.label })),
  { value: "untagged", label: "untagged" },
];

const STATUS_FILTERS: ReadonlyArray<{
  value: IssueStatus | "all";
  label: string;
}> = [
  { value: "all", label: "all" },
  { value: "open", label: "open" },
  { value: "done", label: "done" },
  { value: "dismissed", label: "dismissed" },
];

export function ProjectDetail() {
  const { id = "" } = useParams();
  const { projects, issues } = useStore();
  const store = useStoreApi();
  const toast = useToast();
  const now = Date.now();

  const [tag, setTag] = useState<TagFilter>("all");
  const [status, setStatus] = useState<IssueStatus | "all">("all");
  const [editingMeta, setEditingMeta] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [bulkFor, setBulkFor] = useState<"done" | "dismissed" | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const project = projects.find((p) => p.id === id) ?? null;

  const list = useMemo(
    () => filterProjectIssues(issues, id, { tag, status }),
    [issues, id, tag, status],
  );

  if (!project) {
    return (
      <div className={styles.missing}>
        <p>That project doesn’t exist, or was deleted.</p>
        <Link to="/" className={styles.back}>
          ‹ back to dashboard
        </Link>
      </div>
    );
  }

  const noLinks =
    !project.repoUrl && !project.websiteUrl && !project.hostMachine;
  const hasDetails =
    project.links.length > 0 ||
    project.notes !== null ||
    project.description !== null;

  return (
    <div className={styles.page}>
      <Link to="/" className={styles.back}>
        ‹ back
      </Link>

      <header className={styles.head}>
        <MonogramAvatar name={project.name} size="lg" />
        <div className={styles.headText}>
          <h1 className={styles.name}>{project.name}</h1>
          {project.description ? (
            <LinkText className={styles.description}>
              {project.description}
            </LinkText>
          ) : null}
          <div className={styles.linkline}>
            {project.repoUrl ? (
              <ExternalLink href={project.repoUrl} wrap>
                <span className={styles.urlFull}>{project.repoUrl}</span>
                <span className={styles.urlShort}>repo</span>
              </ExternalLink>
            ) : null}
            {project.websiteUrl ? (
              <ExternalLink href={project.websiteUrl} wrap>
                <span className={styles.urlFull}>{project.websiteUrl}</span>
                <span className={styles.urlShort}>website</span>
              </ExternalLink>
            ) : null}
            {project.hostMachine ? (
              <span className={styles.hostChip}>⌂ {project.hostMachine}</span>
            ) : null}
            {noLinks ? (
              <span className={styles.metaEmpty}>no links yet</span>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          className={styles.editMeta}
          onClick={() => setEditingMeta((v) => !v)}
        >
          {editingMeta ? "close" : "edit meta"}
        </button>
      </header>

      {editingMeta ? (
        <ProjectMetaEditor
          project={project}
          onClose={() => setEditingMeta(false)}
        />
      ) : null}

      {hasDetails ? (
        <div className={styles.detailsWrap}>
          <button
            type="button"
            className={styles.detailsToggle}
            aria-expanded={showDetails}
            onClick={() => setShowDetails((v) => !v)}
          >
            <span
              className={styles.chev}
              data-open={showDetails}
              aria-hidden="true"
            >
              ▸
            </span>
            More details
          </button>
          {showDetails ? <ProjectDetailsPanel project={project} /> : null}
        </div>
      ) : null}

      <div className={styles.filters}>
        <FilterRow label="tag" options={TAG_FILTERS} value={tag} onChange={setTag} />
        <FilterRow
          label="status"
          options={STATUS_FILTERS}
          value={status}
          onChange={setStatus}
        />
      </div>

      <IssueComposer projectId={project.id} />

      {(status === "done" || status === "dismissed") && list.length > 0 ? (
        <div className={styles.bulkBar}>
          <button
            type="button"
            className={styles.bulkBtn}
            onClick={() => setBulkFor(status)}
          >
            {status === "done"
              ? `Delete all done (${list.length})`
              : `Delete all dismissed (${list.length})`}
          </button>
        </div>
      ) : null}

      {list.length === 0 ? (
        <p className={styles.empty}>
          {issues.some((i) => i.projectId === id)
            ? "No issues match this filter."
            : "No issues here yet. Add the first one above."}
        </p>
      ) : (
        <ul className={styles.rows}>
          {list.map((issue) => (
            <li key={issue.id} className={styles.rowWrap}>
              <IssueListRow issue={issue} now={now} />
            </li>
          ))}
        </ul>
      )}

      {bulkFor ? (
        <ConfirmDialog
          title={`Delete ${list.length} ${bulkFor} ${
            list.length === 1 ? "issue" : "issues"
          }?`}
          body="They move to Deleted issues. Purge in Settings removes them for good."
          confirmLabel="Delete"
          tone="danger"
          onCancel={() => setBulkFor(null)}
          onConfirm={async () => {
            if (bulkBusy) return;
            setBulkBusy(true);
            const ids = list.map((i) => i.id);
            try {
              await Promise.all(ids.map((issueId) => store.deleteIssue(issueId)));
              toast(
                `Deleted ${ids.length} ${ids.length === 1 ? "issue" : "issues"}`,
              );
            } finally {
              setBulkBusy(false);
              setBulkFor(null);
            }
          }}
        />
      ) : null}
    </div>
  );
}

interface FilterRowProps<T extends string> {
  label: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}

function FilterRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: FilterRowProps<T>) {
  return (
    <div className={styles.filterRow}>
      <span className={styles.filterLabel}>{label}</span>
      <div className={styles.chips}>
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={styles.chip}
            data-active={opt.value === value}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
