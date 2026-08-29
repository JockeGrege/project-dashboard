import { useEffect, useState } from "react";
import type { Issue } from "@/domain";
import { useStoreApi } from "@/store";
import { relativeTime } from "@/selectors";
import { ConfirmDialog, IssueRow, IssueTextArea, Lightbox } from "@/ui";
import { RowMenu } from "./RowMenu";
import styles from "./IssueListRow.module.css";

interface IssueListRowProps {
  issue: Issue;
  now: number;
}

/** The first few words of an issue, for a delete confirm that names its target. */
function previewWords(text: string, count = 7): string {
  const words = text.trim().split(/\s+/);
  return words.slice(0, count).join(" ") + (words.length > count ? "…" : "");
}

export function IssueListRow({ issue, now }: IssueListRowProps) {
  const store = useStoreApi();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
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
    <>
      <IssueRow
        text={issue.text}
        status={issue.status}
        tag={issue.tag}
        timeLabel={relativeTime(issue.createdAt, now)}
        attachments={issue.attachments}
        onOpenImage={setLightbox}
        actions={
          <RowMenu
            issue={issue}
            onEditText={() => setEditing(true)}
            onDelete={() => setConfirmingDelete(true)}
          />
        }
      />
      {lightbox !== null ? (
        <Lightbox
          urls={issue.attachments}
          index={lightbox}
          onClose={() => setLightbox(null)}
          onIndexChange={setLightbox}
        />
      ) : null}
      {confirmingDelete ? (
        <ConfirmDialog
          title="Delete this issue?"
          body={`“${previewWords(issue.text)}” moves to Deleted issues. Purge in Settings removes it for good.`}
          confirmLabel="Delete"
          tone="danger"
          onConfirm={() => {
            void store.deleteIssue(issue.id);
            setConfirmingDelete(false);
          }}
          onCancel={() => setConfirmingDelete(false)}
        />
      ) : null}
    </>
  );
}
