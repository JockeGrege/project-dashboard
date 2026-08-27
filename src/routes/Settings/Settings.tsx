import { useState } from "react";
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
            min={1}
            max={64}
            className={styles.number}
            value={settings.cardsPerPage}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n) && n >= 1 && n <= 64) {
                void store.updateSettings({ cardsPerPage: Math.floor(n) });
              }
            }}
          />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>default view</span>
          <div className={styles.segs}>
            {VIEW_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                className={styles.seg}
                data-active={settings.viewMode === mode}
                onClick={() => void store.updateSettings({ viewMode: mode })}
              >
                {VIEW_LABELS[mode]}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>default sort</span>
          <div className={styles.segs}>
            {PROJECT_SORTS.map((sort) => (
              <button
                key={sort}
                type="button"
                className={styles.seg}
                data-active={settings.sortOrder === sort}
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
