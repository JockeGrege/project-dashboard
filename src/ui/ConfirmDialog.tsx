import { Modal } from "./Modal";
import styles from "./ConfirmDialog.module.css";

interface ConfirmDialogProps {
  title: string;
  body?: string;
  confirmLabel: string;
  tone?: "default" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}

/** A small modal for irreversible actions. */
export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  tone = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      onClose={onCancel}
      label={title}
      align="center"
      role="alertdialog"
      className={styles.panel}
    >
      <p className={styles.title}>{title}</p>
      {body ? <p className={styles.body}>{body}</p> : null}
      <div className={styles.actions}>
        <button type="button" className={styles.cancel} onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className={styles.confirm}
          data-tone={tone}
          onClick={onConfirm}
          autoFocus
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
