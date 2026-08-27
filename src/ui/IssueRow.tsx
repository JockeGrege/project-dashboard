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
}: IssueRowProps) {
  const body = (
    <>
      <StatusStamp status={status} />
      <span className={styles.text} data-status={status}>
        {text}
      </span>
      <span className={styles.trailing}>
        <TagChip tag={tag} size="sm" />
        {projectName ? (
          <span className={styles.project}>{projectName}</span>
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

  return (
    <div className={styles.row}>
      {body}
      {actions ? <span className={styles.actions}>{actions}</span> : null}
    </div>
  );
}
