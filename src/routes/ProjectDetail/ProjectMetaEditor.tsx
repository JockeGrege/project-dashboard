import { useState } from "react";
import type { Project } from "@/domain";
import { useStore, useStoreApi } from "@/store";
import styles from "./ProjectMetaEditor.module.css";

interface ProjectMetaEditorProps {
  project: Project;
  onClose: () => void;
}

/** Inline editor for a project's name, category and links. */
export function ProjectMetaEditor({ project, onClose }: ProjectMetaEditorProps) {
  const { categories } = useStore();
  const store = useStoreApi();

  const [name, setName] = useState(project.name);
  const [categoryId, setCategoryId] = useState(project.categoryId ?? "");
  const [repoUrl, setRepoUrl] = useState(project.repoUrl ?? "");
  const [hostMachine, setHostMachine] = useState(project.hostMachine ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await store.updateProject(project.id, {
        name: name.trim(),
        categoryId: categoryId || null,
        repoUrl: repoUrl.trim() || null,
        hostMachine: hostMachine.trim() || null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
      setBusy(false);
    }
  }

  return (
    <div className={styles.editor}>
      <label className={styles.field}>
        <span className={styles.label}>name</span>
        <input
          className={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>category</span>
        <select
          className={styles.input}
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">Uncategorised</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span className={styles.label}>repository url</span>
        <input
          className={styles.input}
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          placeholder="https://github.com/…"
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>host machine</span>
        <input
          className={styles.input}
          value={hostMachine}
          onChange={(e) => setHostMachine(e.target.value)}
          placeholder="e.g. macbook-pro"
        />
      </label>

      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.actions}>
        <button type="button" className={styles.cancel} onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className={styles.save}
          onClick={save}
          disabled={!name.trim() || busy}
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
