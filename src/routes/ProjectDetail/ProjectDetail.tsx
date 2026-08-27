import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { IssueStatus, TagFilter } from "@/domain";
import { TAG_LIST } from "@/domain";
import { useStore } from "@/store";
import { filterProjectIssues } from "@/selectors";
import { MonogramAvatar } from "@/ui";
import { IssueComposer } from "./IssueComposer";
import { IssueListRow } from "./IssueListRow";
import { ProjectMetaEditor } from "./ProjectMetaEditor";
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
  const now = Date.now();

  const [tag, setTag] = useState<TagFilter>("all");
  const [status, setStatus] = useState<IssueStatus | "all">("all");
  const [editingMeta, setEditingMeta] = useState(false);

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

  const links = [project.repoUrl, project.hostMachine].filter(Boolean).join(" · ");

  return (
    <div className={styles.page}>
      <Link to="/" className={styles.back}>
        ‹ back
      </Link>

      <header className={styles.head}>
        <MonogramAvatar name={project.name} size="lg" />
        <div className={styles.headText}>
          <h1 className={styles.name}>{project.name}</h1>
          <p className={styles.meta}>{links || "no links yet"}</p>
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
