import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/store";
import { monogram, search } from "@/selectors";
import { TagChip } from "@/ui";
import styles from "./CommandSearch.module.css";

/**
 * ⌘K search across project names and issue text. An issue hit carries its
 * project, so a result stays actionable even when you searched a word from the
 * note rather than the project name.
 */
export function CommandSearch({ onClose }: { onClose: () => void }) {
  const { projects, issues } = useStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  const results = useMemo(() => {
    const { projects: p, issues: i } = search(query, projects, issues);
    return [
      ...p.slice(0, 6).map((project) => ({
        key: `p-${project.id}`,
        kind: "project" as const,
        to: `/project/${project.id}`,
        project,
      })),
      ...i.slice(0, 8).map((row) => ({
        key: `i-${row.issue.id}`,
        kind: "issue" as const,
        to: `/project/${row.project.id}`,
        row,
      })),
    ];
  }, [query, projects, issues]);

  useEffect(() => setActive(0), [query]);

  const go = (to: string) => {
    navigate(to);
    onClose();
  };

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label="Search"
      >
        <input
          ref={inputRef}
          className={styles.input}
          placeholder="Search projects and issues…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, results.length - 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            }
            if (e.key === "Enter") {
              const sel = results[active];
              if (sel) go(sel.to);
            }
          }}
        />

        {query.trim() && results.length === 0 ? (
          <p className={styles.empty}>Nothing matches “{query.trim()}”.</p>
        ) : null}

        <ul className={styles.results}>
          {results.map((r, i) => (
            <li key={r.key}>
              <button
                type="button"
                className={styles.result}
                data-active={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(r.to)}
              >
                {r.kind === "project" ? (
                  <>
                    <span className={styles.mono}>{monogram(r.project.name)}</span>
                    <span className={styles.text}>{r.project.name}</span>
                    <span className={styles.kind}>project</span>
                  </>
                ) : (
                  <>
                    <span className={styles.text} data-status={r.row.issue.status}>
                      {r.row.issue.text}
                    </span>
                    <TagChip tag={r.row.issue.tag} size="sm" />
                    <span className={styles.kind}>{r.row.project.name}</span>
                  </>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
