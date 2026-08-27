import { useMemo, useState } from "react";
import type { Project, Tag } from "@/domain";
import { useStore, useStoreApi } from "@/store";
import { monogram } from "@/selectors";
import { Modal, TagPicker } from "@/ui";
import styles from "./QuickAdd.module.css";

interface QuickAddProps {
  onClose: () => void;
  /** Preselect a project (e.g. opened from a project screen). */
  projectId?: string;
  onFiled?: (projectName: string) => void;
}

/**
 * The primary capture path: text, a project, and an optional tag. Submitting
 * without a tag is a first-class outcome — no warning, no confirm.
 */
export function QuickAdd({ onClose, projectId, onFiled }: QuickAddProps) {
  const { projects } = useStore();
  const store = useStoreApi();

  const [text, setText] = useState("");
  const [picked, setPicked] = useState<string | null>(projectId ?? null);
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<Tag | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...projects].sort((a, b) => a.name.localeCompare(b.name)),
    [projects],
  );
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? sorted.filter((p) => p.name.toLowerCase().includes(q))
      : sorted;
    return list.slice(0, 6);
  }, [sorted, query]);

  const pickedProject = pickable(projects, picked);
  const canSubmit = text.trim().length > 0 && pickedProject !== null && !busy;

  async function submit() {
    if (!canSubmit || !pickedProject) return;
    setBusy(true);
    setError(null);
    try {
      await store.createIssue({
        projectId: pickedProject.id,
        text: text.trim(),
        tag,
      });
      onFiled?.(pickedProject.name);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't file that.");
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose} label="File an idea" className={styles.panel}>
      <p className={styles.title}>File an idea</p>

      <input
        autoFocus
        className={styles.text}
        placeholder="What's the improvement?"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && canSubmit) submit();
        }}
      />

        <div className={styles.projectField}>
          <span className={styles.arrow} aria-hidden="true">
            →
          </span>
          {pickedProject ? (
            <button
              type="button"
              className={styles.pickedChip}
              onClick={() => {
                setPicked(null);
                setQuery("");
              }}
            >
              <span className={styles.chipMono}>
                {monogram(pickedProject.name)}
              </span>
              {pickedProject.name}
              <span aria-hidden="true">×</span>
            </button>
          ) : (
            <input
              className={styles.projectInput}
              placeholder="project"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          )}
        </div>

        {!pickedProject ? (
          <ul className={styles.results}>
            {matches.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className={styles.result}
                  onClick={() => setPicked(p.id)}
                >
                  <span className={styles.chipMono}>{monogram(p.name)}</span>
                  {p.name}
                </button>
              </li>
            ))}
            {matches.length === 0 ? (
              <li className={styles.noResults}>No project matches “{query}”.</li>
            ) : null}
          </ul>
        ) : null}

        <div className={styles.tagRow}>
          <span className={styles.tagHint}>tag — optional</span>
          <TagPicker value={tag} onChange={setTag} />
        </div>

        {error ? <p className={styles.error}>{error}</p> : null}

        <div className={styles.footer}>
          <button type="button" className={styles.cancel} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.file}
            disabled={!canSubmit}
            onClick={submit}
          >
            {busy ? "Filing…" : "File ⏎"}
          </button>
        </div>
    </Modal>
  );
}

function pickable(
  projects: readonly Project[],
  id: string | null,
): Project | null {
  if (!id) return null;
  return projects.find((p) => p.id === id) ?? null;
}
