import type { Attachment } from "./attachment-list";
import styles from "./AttachmentStrip.module.css";

interface AttachmentStripProps {
  items: readonly Attachment[];
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
}

/**
 * The pending-attachment row under a composer's textarea. Presentational: it
 * renders whatever `useIssueAttachments` holds and reports Retry / Remove back
 * up. Nothing here uploads.
 */
export function AttachmentStrip({ items, onRetry, onRemove }: AttachmentStripProps) {
  if (items.length === 0) return null;

  return (
    <ul className={styles.strip} aria-label="Attached images">
      {items.map((a) => (
        <li
          key={a.id}
          className={styles.tile}
          data-status={a.status}
          title={a.status === "error" ? `${a.name} — ${a.error}` : a.name}
        >
          <img className={styles.thumb} src={a.localUrl} alt={a.name} />

          {a.status === "uploading" ? (
            <span className={styles.spinner} aria-label="Uploading">
              <span className={styles.spin} aria-hidden="true" />
            </span>
          ) : null}

          {a.status === "error" ? (
            <span className={styles.err}>
              <span className={styles.errMsg}>{a.error}</span>
              <span className={styles.errActions}>
                <button
                  type="button"
                  className={styles.errBtn}
                  onClick={() => onRetry(a.id)}
                >
                  Retry
                </button>
                <button
                  type="button"
                  className={styles.errBtn}
                  onClick={() => onRemove(a.id)}
                >
                  Remove
                </button>
              </span>
            </span>
          ) : (
            <button
              type="button"
              className={styles.remove}
              aria-label={`Remove ${a.name}`}
              onClick={() => onRemove(a.id)}
            >
              ×
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
