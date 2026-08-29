import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { IssueStatus, Tag } from "@/domain";
import { StatusStamp } from "./StatusStamp";
import { TagChip } from "./TagChip";
import styles from "./IssueRow.module.css";

interface IssueRowProps {
  text: string;
  status: IssueStatus;
  tag: Tag | null;
  /** Compact relative time, e.g. "3d". */
  timeLabel: string;
  /** Shown on the right in the global feed; omitted on a project's own screen. */
  projectName?: string;
  /** When set, the whole row links here. */
  to?: string;
  /** Trailing controls (e.g. a row menu) on the project detail screen. */
  actions?: ReactNode;
  /** Hosted image URLs filed with the issue. */
  attachments?: readonly string[];
  /** Open the lightbox at this index. Only wired on non-link rows (project detail). */
  onOpenImage?: (index: number) => void;
}

/**
 * One issue against the ledger gutter. `done` strikes the text through;
 * `dismissed` mutes it but never strikes it — the two must stay distinct.
 */
export function IssueRow({
  text,
  status,
  tag,
  timeLabel,
  projectName,
  to,
  actions,
  attachments,
  onOpenImage,
}: IssueRowProps) {
  const count = attachments?.length ?? 0;

  const body = (
    <>
      <StatusStamp status={status} />
      {/* keyed by status so the strike-through wipes in when an issue is completed */}
      <span
        key={`text-${status}`}
        className={styles.text}
        data-status={status}
      >
        {text}
      </span>
      <span className={styles.trailing}>
        <TagChip tag={tag} size="sm" />
        {projectName ? (
          <span className={styles.project}>{projectName}</span>
        ) : null}
        {to && count > 0 ? (
          <span className={styles.attachMeta}>
            {count} image{count === 1 ? "" : "s"}
          </span>
        ) : null}
        <span className={styles.time}>{timeLabel}</span>
      </span>
    </>
  );

  if (to) {
    return (
      <Link to={to} className={styles.row} data-interactive>
        {body}
      </Link>
    );
  }

  const thumbs =
    count > 0 && attachments ? (
      <div className={styles.thumbs}>
        {attachments.map((url, i) => (
          <button
            key={`${url}-${i}`}
            type="button"
            className={styles.thumb}
            aria-label={`View image ${i + 1} of ${count}`}
            onClick={() => onOpenImage?.(i)}
          >
            <img src={url} alt="" loading="lazy" />
          </button>
        ))}
      </div>
    ) : null;

  if (thumbs) {
    return (
      <div className={styles.group}>
        <div className={styles.row}>
          {body}
          {actions ? <span className={styles.actions}>{actions}</span> : null}
        </div>
        {thumbs}
      </div>
    );
  }

  return (
    <div className={styles.row}>
      {body}
      {actions ? <span className={styles.actions}>{actions}</span> : null}
    </div>
  );
}
