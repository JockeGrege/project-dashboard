import { useEffect, useState } from "react";
import type { Issue } from "@/domain";
import { useStoreApi } from "@/store";
import { relativeTime } from "@/selectors";
import { IssueRow, IssueTextArea } from "@/ui";
import { RowMenu } from "./RowMenu";
import styles from "./IssueListRow.module.css";

interface IssueListRowProps {
  issue: Issue;
  now: number;
}

export function IssueListRow({ issue, now }: IssueListRowProps) {
  const store = useStoreApi();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(issue.text);

  useEffect(() => {
    if (editing) setDraft(issue.text);
  }, [editing, issue.text]);

  async function save() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (trimmed !== issue.text) {
      await store.updateIssueText(issue.id, trimmed);
    }
    setEditing(false);
  }

  if (editing) {
    return (
      <div className={styles.editRow}>
        <div
          onKeyDown={(e) => {
            if (e.key === "Escape") setEditing(false);
          }}
        >
          <IssueTextArea
            value={draft}
            onChange={setDraft}
            onSubmit={save}
            autoFocus
            minRows={2}
            label="Edit issue text"
          />
        </div>
        <div className={styles.editActions}>
          <span className={styles.hint}>⌘⏎ to save · Esc to cancel</span>
          <button type="button" className={styles.save} onClick={save}>
            Save
          </button>
          <button
            type="button"
            className={styles.cancel}
            onClick={() => setEditing(false)}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <IssueRow
      text={issue.text}
      status={issue.status}
      tag={issue.tag}
      timeLabel={relativeTime(issue.createdAt, now)}
      actions={<RowMenu issue={issue} onEditText={() => setEditing(true)} />}
    />
  );
}
