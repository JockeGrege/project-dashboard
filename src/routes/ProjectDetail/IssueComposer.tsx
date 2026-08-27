import { useRef, useState } from "react";
import type { Tag } from "@/domain";
import { useStoreApi } from "@/store";
import { Popover, TagChip, TagPicker } from "@/ui";
import styles from "./IssueComposer.module.css";

interface IssueComposerProps {
  projectId: string;
  onAdded?: () => void;
}

/** The always-present "add an issue" row at the top of a project's list. */
export function IssueComposer({ projectId, onAdded }: IssueComposerProps) {
  const store = useStoreApi();
  const [text, setText] = useState("");
  const [tag, setTag] = useState<Tag | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function add() {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      await store.createIssue({ projectId, text: trimmed, tag });
      setText("");
      setTag(null);
      onAdded?.();
      inputRef.current?.focus();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.composer}>
      <span className={styles.plus} aria-hidden="true">
        +
      </span>
      <input
        ref={inputRef}
        className={styles.input}
        placeholder="add an issue…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") add();
        }}
      />
      <Popover
        triggerLabel="Choose a tag"
        align="end"
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
      <button
        type="button"
        className={styles.add}
        onClick={add}
        disabled={!text.trim() || busy}
      >
        Add
      </button>
    </div>
  );
}
