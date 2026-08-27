import type { IssueStatus } from "@/domain";
import styles from "./StatusStamp.module.css";

const GLYPH: Record<IssueStatus, string> = {
  open: "▪",
  done: "✓",
  dismissed: "╱",
};

const LABEL: Record<IssueStatus, string> = {
  open: "Open",
  done: "Done",
  dismissed: "Dismissed",
};

/**
 * The signature element. A hand-set mark in the ledger gutter that says an
 * issue's state at a glance: filled square (open), check (done), slash
 * (dismissed). Done and dismissed must never look alike — see DESIGN.md §3.
 */
export function StatusStamp({ status }: { status: IssueStatus }) {
  return (
    <span
      className={styles.stamp}
      data-status={status}
      role="img"
      aria-label={LABEL[status]}
    >
      {GLYPH[status]}
    </span>
  );
}
