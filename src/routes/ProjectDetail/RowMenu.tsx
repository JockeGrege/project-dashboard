import type { Issue, IssueStatus } from "@/domain";
import { useStoreApi } from "@/store";
import { MenuItem, MenuLabel, MenuSeparator, Popover, TagPicker } from "@/ui";
import styles from "./RowMenu.module.css";

interface RowMenuProps {
  issue: Issue;
  onEditText: () => void;
  /** The host confirms before the soft delete. */
  onDelete: () => void;
}

/** Per-issue actions: edit, retag, and the three resolutions. */
export function RowMenu({ issue, onEditText, onDelete }: RowMenuProps) {
  const store = useStoreApi();

  const setStatus = (status: IssueStatus, close: () => void) => {
    void store.setIssueStatus(issue.id, status);
    close();
  };

  return (
    <Popover triggerLabel="Issue actions" trigger={<span aria-hidden="true">⋯</span>}>
      {(close) => (
        <>
          <MenuItem
            onClick={() => {
              onEditText();
              close();
            }}
          >
            Edit text
          </MenuItem>

          <MenuSeparator />
          <MenuLabel>Tag</MenuLabel>
          <div className={styles.tagWrap}>
            <TagPicker
              value={issue.tag}
              onChange={(next) => {
                void store.setIssueTag(issue.id, next);
                close();
              }}
              allowClear
              size="sm"
            />
          </div>

          <MenuSeparator />
          {issue.status !== "open" ? (
            <MenuItem onClick={() => setStatus("open", close)}>Reopen</MenuItem>
          ) : null}
          {issue.status !== "done" ? (
            <MenuItem onClick={() => setStatus("done", close)}>
              {issue.status === "open" ? "Mark done" : "Mark done instead"}
            </MenuItem>
          ) : null}
          {issue.status !== "dismissed" ? (
            <MenuItem onClick={() => setStatus("dismissed", close)}>
              {issue.status === "open" ? "Dismiss" : "Dismiss instead"}
            </MenuItem>
          ) : null}

          <MenuSeparator />
          <MenuItem
            tone="danger"
            onClick={() => {
              close();
              onDelete();
            }}
          >
            Delete
          </MenuItem>
        </>
      )}
    </Popover>
  );
}
