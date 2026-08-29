import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { PROJECT_SORTS, VIEW_MODES, type ProjectSort, type ViewMode } from "@/domain";
import { useStore, useStoreApi } from "@/store";
import { useToast } from "@/app/toast-context";
import { relativeTime } from "@/selectors";
import { ConfirmDialog } from "@/ui";
import { CategoryManager } from "./CategoryManager";
import styles from "./Settings.module.css";

const SORT_LABELS: Record<ProjectSort, string> = {
  name: "name",
  added: "date added",
  activity: "last activity",
};

const VIEW_LABELS: Record<ViewMode, string> = {
  flat: "flat",
  category: "category",
};

export function Settings() {
  const { settings, deletedIssueCount } = useStore();
  const store = useStoreApi();
  const toast = useToast();
  const now = Date.now();
  const [confirmPurge, setConfirmPurge] = useState(false);

  // Edited as free text so the field can be cleared to type a new value — a
  // fully controlled number input snaps back to the last valid number on every
  // keystroke, which made a single digit impossible to delete on mobile. Each
  // keystroke that lands on a valid value commits straight away (no Enter
  // needed); the field is only reconciled from the store while it's not focused,
  // so a background commit can't clobber a half-typed number.
  const [cppText, setCppText] = useState(String(settings.cardsPerPage));
  const cppFocused = useRef(false);

  useEffect(() => {
    if (!cppFocused.current) setCppText(String(settings.cardsPerPage));
  }, [settings.cardsPerPage]);

  const parseCpp = (raw: string): number | null => {
    const n = Math.floor(Number(raw));
    return raw.trim() !== "" && Number.isFinite(n) && n >= 1 && n <= 64
      ? n
      : null;
  };

  const onCppChange = (raw: string) => {
    setCppText(raw);
    const n = parseCpp(raw);
    if (n !== null && n !== settings.cardsPerPage) {
      void store.updateSettings({ cardsPerPage: n });
    }
  };

  const onCppBlur = () => {
    cppFocused.current = false;
    const n = parseCpp(cppText);
    setCppText(String(n ?? settings.cardsPerPage));
  };

  return (
    <div className={styles.page}>
      <Link to="/" className={styles.back}>
        ‹ back
      </Link>
      <h1 className={styles.title}>Settings</h1>

      <section className={styles.section}>
        <h2 className={styles.heading}>Dashboard</h2>

        <div className={styles.field}>
          <label htmlFor="cpp" className={styles.label}>
            cards per page
          </label>
          <p className={styles.hint}>
            Flat view only. Category view scrolls.
          </p>
          <input
            id="cpp"
            type="number"
            inputMode="numeric"
            min={1}
            max={64}
            className={styles.number}
            value={cppText}
            onFocus={() => {
              cppFocused.current = true;
            }}
            onChange={(e) => onCppChange(e.target.value)}
            onBlur={onCppBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
          />
        </div>

        <div className={styles.field}>
          <span className={styles.label} id="set-view">
            default view
          </span>
          <div className={styles.segs} role="group" aria-labelledby="set-view">
            {VIEW_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                className={styles.seg}
                data-active={settings.viewMode === mode}
                aria-pressed={settings.viewMode === mode}
                onClick={() => void store.updateSettings({ viewMode: mode })}
              >
                {VIEW_LABELS[mode]}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <span className={styles.label} id="set-sort">
            default sort
          </span>
          <div className={styles.segs} role="group" aria-labelledby="set-sort">
            {PROJECT_SORTS.map((sort) => (
              <button
                key={sort}
                type="button"
                className={styles.seg}
                data-active={settings.sortOrder === sort}
                aria-pressed={settings.sortOrder === sort}
                onClick={() => void store.updateSettings({ sortOrder: sort })}
              >
                {SORT_LABELS[sort]}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>Categories</h2>
        <p className={styles.hint}>
          Drag order isn’t here yet — use the arrows. Deleting a category keeps its
          projects and moves them to Uncategorised.
        </p>
        <CategoryManager />
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>Maintenance</h2>
        <p className={styles.purge}>
          <span>
            Deleted issues: <strong>{deletedIssueCount}</strong>
          </span>
          {deletedIssueCount > 0 ? (
            <button
              type="button"
              className={styles.purgeBtn}
              onClick={() => setConfirmPurge(true)}
            >
              Purge
            </button>
          ) : null}
        </p>
        <p className={styles.hint}>
          {settings.lastPurgeAt
            ? `Last purged ${relativeTime(settings.lastPurgeAt, now)} ago.`
            : "Never purged. Soft-deleted issues stay as hidden tombstones until you clear them here."}
        </p>
      </section>

      {confirmPurge ? (
        <ConfirmDialog
          title={`Permanently remove ${deletedIssueCount} deleted ${
            deletedIssueCount === 1 ? "issue" : "issues"
          }?`}
          body="This can't be undone."
          confirmLabel={`Purge ${deletedIssueCount}`}
          tone="danger"
          onCancel={() => setConfirmPurge(false)}
          onConfirm={async () => {
            const removed = await store.purgeDeletedIssues();
            setConfirmPurge(false);
            toast(`Purged ${removed} ${removed === 1 ? "issue" : "issues"}`);
          }}
        />
      ) : null}
    </div>
  );
}
