import { useState } from "react";
import type { Project } from "@/domain";
import { useStore, useStoreApi } from "@/store";
import styles from "./ProjectMetaEditor.module.css";

interface ProjectMetaEditorProps {
  project: Project;
  onClose: () => void;
}

interface LinkRow {
  label: string;
  url: string;
}

/** Inline editor for a project's name, category, links and maintenance notes. */
export function ProjectMetaEditor({ project, onClose }: ProjectMetaEditorProps) {
  const { categories } = useStore();
  const store = useStoreApi();

  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [categoryId, setCategoryId] = useState(project.categoryId ?? "");
  const [repoUrl, setRepoUrl] = useState(project.repoUrl ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(project.websiteUrl ?? "");
  const [hostMachine, setHostMachine] = useState(project.hostMachine ?? "");
  const [links, setLinks] = useState<LinkRow[]>(
    project.links.map((l) => ({ label: l.label, url: l.url })),
  );
  const [notes, setNotes] = useState(project.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setLink = (i: number, next: Partial<LinkRow>) =>
    setLinks((rows) => rows.map((r, j) => (j === i ? { ...r, ...next } : r)));
  const addLink = () => setLinks((rows) => [...rows, { label: "", url: "" }]);
  const removeLink = (i: number) =>
    setLinks((rows) => rows.filter((_, j) => j !== i));

  async function save() {
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await store.updateProject(project.id, {
        name: name.trim(),
        description: description.trim() || null,
        categoryId: categoryId || null,
        repoUrl: repoUrl.trim() || null,
        websiteUrl: websiteUrl.trim() || null,
        hostMachine: hostMachine.trim() || null,
        links: links
          .map((l) => ({ label: l.label.trim(), url: l.url.trim() }))
          .filter((l) => l.label || l.url),
        notes: notes.trim() || null,
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
        <span className={styles.label}>one-line description</span>
        <input
          className={styles.input}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={280}
          placeholder="what it's for, in a sentence"
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
        <span className={styles.label}>website url</span>
        <input
          className={styles.input}
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
          placeholder="https://…"
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

      <div className={styles.field}>
        <span className={styles.label}>more links</span>
        {links.length === 0 ? (
          <p className={styles.hint}>
            Firebase console, deploy board, a runbook — anything worth keeping one
            click away.
          </p>
        ) : null}
        {links.map((row, i) => (
          <div key={i} className={styles.linkRow}>
            <input
              className={styles.input}
              value={row.label}
              onChange={(e) => setLink(i, { label: e.target.value })}
              placeholder="label"
              aria-label={`Link ${i + 1} label`}
            />
            <input
              className={styles.input}
              value={row.url}
              onChange={(e) => setLink(i, { url: e.target.value })}
              placeholder="https://…"
              aria-label={`Link ${i + 1} URL`}
            />
            <button
              type="button"
              className={styles.removeLink}
              onClick={() => removeLink(i)}
              aria-label={`Remove link ${i + 1}`}
            >
              ×
            </button>
          </div>
        ))}
        <button type="button" className={styles.addLink} onClick={addLink}>
          + add link
        </button>
      </div>

      <label className={styles.field}>
        <span className={styles.label}>maintenance notes — Markdown</span>
        <textarea
          className={styles.textarea}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={6}
          placeholder={"## Deploy\n- run `npm run deploy`\n- console: https://…"}
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
