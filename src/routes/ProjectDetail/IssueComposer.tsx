import { useState } from "react";
import type { Tag } from "@/domain";
import { useStoreApi } from "@/store";
import { AttachmentStrip, useIssueAttachments } from "@/uploads";
import { IssueTextArea, Popover, TagChip, TagPicker } from "@/ui";
import styles from "./IssueComposer.module.css";

interface IssueComposerProps {
  projectId: string;
  onAdded?: () => void;
}

/** The always-present "add an issue" block at the top of a project's list. */
export function IssueComposer({ projectId, onAdded }: IssueComposerProps) {
  const store = useStoreApi();
  const att = useIssueAttachments();
  const [text, setText] = useState("");
  const [tag, setTag] = useState<Tag | null>(null);
  const [busy, setBusy] = useState(false);

  const blocked = busy || att.isUploading || att.hasError;

  async function add() {
    const trimmed = text.trim();
    if (!trimmed || blocked) return;
    setBusy(true);
    try {
      await store.createIssue({ projectId, text: trimmed, tag, attachments: att.urls });
      setText("");
      setTag(null);
      att.reset();
      onAdded?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.composer}>
      <IssueTextArea
        value={text}
        onChange={setText}
        onSubmit={add}
        onImagePaste={att.addFiles}
        placeholder="Add an issue…"
        minRows={2}
        label="New issue text"
      />
      <AttachmentStrip
        items={att.items}
        onRetry={att.retry}
        onRemove={att.remove}
      />
      <div className={styles.controls}>
        <Popover
          triggerLabel="Choose a tag"
          align="start"
          trigger={
            tag ? (
              <TagChip tag={tag} size="sm" />
            ) : (
              <span className={styles.tagHint}>tag ▾</span>
            )
          }
        >
          {(close) => (
            <div className={styles.tagPop}>
              <TagPicker
                value={tag}
                onChange={(next) => {
                  setTag(next);
                  close();
                }}
                allowClear
                size="sm"
              />
            </div>
          )}
        </Popover>
        <span className={styles.hint}>
          {att.isUploading
            ? "waiting for uploads…"
            : att.hasError
              ? "resolve failed uploads"
              : "⌘⏎ to add"}
        </span>
        <button
          type="button"
          className={styles.add}
          onClick={add}
          disabled={!text.trim() || blocked}
        >
          Add
        </button>
      </div>
    </div>
  );
}
