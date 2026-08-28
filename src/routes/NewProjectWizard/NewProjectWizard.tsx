import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CATEGORY_COLOURS,
  DEFAULT_CATEGORY_COLOUR,
  type Tag,
} from "@/domain";
import { useStore, useStoreApi } from "@/store";
import { TagPicker } from "@/ui";
import styles from "./NewProjectWizard.module.css";

const STEPS = ["Name the project", "Which category?", "Where does it live?", "First idea?"] as const;

interface Draft {
  name: string;
  description: string;
  categoryId: string | null;
  repoUrl: string;
  websiteUrl: string;
  hostMachine: string;
  firstIssue: string;
  firstTag: Tag | null;
}

const EMPTY: Draft = {
  name: "",
  description: "",
  categoryId: null,
  repoUrl: "",
  websiteUrl: "",
  hostMachine: "",
  firstIssue: "",
  firstTag: null,
};

export function NewProjectWizard() {
  const { categories } = useStore();
  const store = useStoreApi();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patch = (next: Partial<Draft>) => setDraft((d) => ({ ...d, ...next }));

  const canContinue = step === 0 ? draft.name.trim().length > 0 : true;
  const isLast = step === STEPS.length - 1;

  async function create() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const id = await store.createProject({
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        categoryId: draft.categoryId,
        repoUrl: draft.repoUrl.trim() || null,
        websiteUrl: draft.websiteUrl.trim() || null,
        hostMachine: draft.hostMachine.trim() || null,
        ...(draft.firstIssue.trim()
          ? { firstIssue: { text: draft.firstIssue.trim(), tag: draft.firstTag } }
          : {}),
      });
      navigate(`/project/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create that.");
      setBusy(false);
    }
  }

  return (
    <div className={styles.page}>
      <Link to="/" className={styles.back}>
        ‹ back
      </Link>

      <div className={styles.progress} aria-label={`Step ${step + 1} of ${STEPS.length}`}>
        {STEPS.map((_, i) => (
          <span key={i} className={styles.pip} data-filled={i <= step} />
        ))}
        <span className={styles.stepCount}>
          step {step + 1} of {STEPS.length}
        </span>
      </div>

      <h1 className={styles.title}>{STEPS[step]}</h1>

      <div className={styles.body}>
        {step === 0 ? (
          <>
            <label className={styles.field}>
              <span className={styles.label}>project name</span>
              <input
                className={styles.input}
                value={draft.name}
                onChange={(e) => patch({ name: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canContinue) setStep(1);
                }}
                autoFocus
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>one-line description — optional</span>
              <input
                className={styles.input}
                value={draft.description}
                onChange={(e) => patch({ description: e.target.value })}
                placeholder="what it's for, in a sentence"
                maxLength={280}
              />
            </label>
          </>
        ) : null}

        {step === 1 ? (
          <CategoryStep
            categories={categories}
            selected={draft.categoryId}
            onSelect={(categoryId) => patch({ categoryId })}
            onCreate={async (name, colour) => {
              const cid = await store.createCategory({ name, colour });
              patch({ categoryId: cid });
            }}
          />
        ) : null}

        {step === 2 ? (
          <>
            <label className={styles.field}>
              <span className={styles.label}>repository url — optional</span>
              <input
                className={styles.input}
                value={draft.repoUrl}
                onChange={(e) => patch({ repoUrl: e.target.value })}
                placeholder="https://github.com/…"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>website url — optional</span>
              <input
                className={styles.input}
                value={draft.websiteUrl}
                onChange={(e) => patch({ websiteUrl: e.target.value })}
                placeholder="https://…"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>host machine — optional</span>
              <input
                className={styles.input}
                value={draft.hostMachine}
                onChange={(e) => patch({ hostMachine: e.target.value })}
                placeholder="e.g. macbook-pro"
              />
            </label>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <label className={styles.field}>
              <span className={styles.label}>first idea — optional</span>
              <input
                className={styles.input}
                value={draft.firstIssue}
                onChange={(e) => patch({ firstIssue: e.target.value })}
                autoFocus
              />
            </label>
            {draft.firstIssue.trim() ? (
              <div className={styles.field}>
                <span className={styles.label}>tag — optional</span>
                <TagPicker
                  value={draft.firstTag}
                  onChange={(firstTag) => patch({ firstTag })}
                />
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.footer}>
        {step > 0 ? (
          <button
            type="button"
            className={styles.ghost}
            onClick={() => setStep((s) => s - 1)}
          >
            ‹ back
          </button>
        ) : (
          <span />
        )}
        {isLast ? (
          <button
            type="button"
            className={styles.primary}
            onClick={create}
            disabled={busy}
          >
            {busy ? "Creating…" : "Create project"}
          </button>
        ) : (
          <button
            type="button"
            className={styles.primary}
            onClick={() => setStep((s) => s + 1)}
            disabled={!canContinue}
          >
            continue ›
          </button>
        )}
      </div>
    </div>
  );
}

interface CategoryStepProps {
  categories: ReturnType<typeof useStore>["categories"];
  selected: string | null;
  onSelect: (categoryId: string | null) => void;
  onCreate: (name: string, colour: string) => Promise<void>;
}

function CategoryStep({
  categories,
  selected,
  onSelect,
  onCreate,
}: CategoryStepProps) {
  const [newName, setNewName] = useState("");
  const [colour, setColour] = useState(DEFAULT_CATEGORY_COLOUR);
  const [creating, setCreating] = useState(false);

  const usedColours = useMemo(
    () => new Set(categories.map((c) => c.colour.toLowerCase())),
    [categories],
  );

  async function create() {
    if (!newName.trim() || creating) return;
    setCreating(true);
    try {
      await onCreate(newName.trim(), colour);
      setNewName("");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className={styles.categoryStep}>
      <div className={styles.categoryChips}>
        <button
          type="button"
          className={styles.categoryChip}
          data-active={selected === null}
          onClick={() => onSelect(null)}
        >
          Uncategorised
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            className={styles.categoryChip}
            data-active={selected === c.id}
            onClick={() => onSelect(c.id)}
          >
            <span
              className={styles.swatch}
              style={{ background: c.colour }}
              aria-hidden="true"
            />
            {c.name}
          </button>
        ))}
      </div>

      <div className={styles.newCategory}>
        <span className={styles.label}>new category</span>
        <div className={styles.newCategoryRow}>
          <input
            className={styles.input}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. work"
            onKeyDown={(e) => {
              if (e.key === "Enter") create();
            }}
          />
          <button
            type="button"
            className={styles.ghost}
            onClick={create}
            disabled={!newName.trim() || creating}
          >
            create
          </button>
        </div>
        <div className={styles.swatches}>
          {CATEGORY_COLOURS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={styles.swatchButton}
              data-active={colour === c.hex}
              data-used={usedColours.has(c.hex.toLowerCase())}
              style={{ background: c.hex }}
              aria-label={c.label}
              onClick={() => setColour(c.hex)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
