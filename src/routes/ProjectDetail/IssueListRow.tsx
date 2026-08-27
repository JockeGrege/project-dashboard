import { useEffect, useRef, useState } from "react";
import type { Issue } from "@/domain";
import { useStoreApi } from "@/store";
import { relativeTime } from "@/selectors";
import { IssueRow } from "@/ui";
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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(issue.text);
      inputRef.current?.focus();
      inputRef.current?.select();
    }
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
        <input
          ref={inputRef}
          className={styles.input}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
        />
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
