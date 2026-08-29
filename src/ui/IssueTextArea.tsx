import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import { useBackClose } from "./back-close";
import styles from "./IssueTextArea.module.css";

interface IssueTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  /** Fired on Cmd/Ctrl+Enter. Enter alone inserts a newline. */
  onSubmit?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  /** Height floor, in rows. Default 6. */
  minRows?: number;
  /** `display` uses the large heading face (capture); `body` is the inline size. */
  variant?: "display" | "body";
  /** Accessible name, also the full-screen editor's title. */
  label: string;
  /** Show the expand-to-full-screen control. Default true. */
  expandable?: boolean;
  /**
   * Called with image files the user supplied by pasting a screenshot, dropping
   * files onto the field, or picking them with the "＋" control. When it's
   * provided the paste/drop of an image is intercepted (plain-text paste is
   * untouched) and the picker button is shown. Not wired into the full-screen
   * editor.
   */
  onImageFiles?: (files: File[]) => void;
}

const imageFilesOf = (list: FileList | null | undefined): File[] =>
  list ? Array.from(list).filter((f) => f.type.startsWith("image/")) : [];

/** Image files from a clipboard/drag payload, tolerating either shape. */
function imageFilesFromTransfer(dt: DataTransfer): File[] {
  const direct = imageFilesOf(dt.files);
  if (direct.length > 0) return direct;
  return Array.from(dt.items)
    .filter((it) => it.kind === "file" && it.type.startsWith("image/"))
    .map((it) => it.getAsFile())
    .filter((f): f is File => f !== null);
}

/**
 * Multi-line issue input. Grows with its content up to ~half the viewport, then
 * scrolls internally; an expand control opens a full-screen editor for long
 * writing. Enter is a newline — submit is Cmd/Ctrl+Enter or the host's button.
 */
export function IssueTextArea({
  value,
  onChange,
  onSubmit,
  placeholder,
  autoFocus,
  minRows = 6,
  variant = "body",
  label,
  expandable = true,
  onImageFiles,
}: IssueTextAreaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [dragging, setDragging] = useState(false);

  // Corner controls float over the field; reserve room so text wraps before it
  // runs under them rather than disappearing behind a button.
  const toolCount = (expandable ? 1 : 0) + (onImageFiles ? 1 : 0);

  const autosize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = Math.round(window.innerHeight * 0.5);
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, max);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > max ? "auto" : "hidden";
  }, []);

  useLayoutEffect(autosize, [value, autosize]);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      // We've handled the shortcut — don't let a host also act on it.
      e.stopPropagation();
      onSubmit?.();
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    if (!onImageFiles) return;
    const files = imageFilesFromTransfer(e.clipboardData);
    if (files.length === 0) return; // let plain-text paste through untouched
    e.preventDefault();
    onImageFiles(files);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (!onImageFiles || !Array.from(e.dataTransfer.types).includes("Files")) return;
    e.preventDefault();
    setDragging(true);
  };
  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setDragging(false);
    }
  };
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    setDragging(false);
    if (!onImageFiles) return;
    const files = imageFilesFromTransfer(e.dataTransfer);
    if (files.length === 0) return; // a text/other drop keeps its native behaviour
    e.preventDefault();
    onImageFiles(files);
  };

  return (
    <div
      className={styles.wrap}
      data-dragging={onImageFiles ? dragging : undefined}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <textarea
        ref={ref}
        className={styles.area}
        data-variant={variant}
        data-tools={toolCount || undefined}
        style={{ minHeight: `${minRows * 1.5}em` }}
        rows={minRows}
        placeholder={placeholder}
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
      />

      {onImageFiles ? (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className={styles.fileInput}
            tabIndex={-1}
            onChange={(e) => {
              const files = imageFilesOf(e.target.files);
              if (files.length > 0) onImageFiles(files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            className={styles.pick}
            aria-label="Add image"
            onClick={() => fileRef.current?.click()}
          >
            <span aria-hidden="true">＋</span>
          </button>
        </>
      ) : null}

      {expandable ? (
        <button
          type="button"
          className={styles.expand}
          aria-label="Expand editor to full screen"
          onClick={() => setFullscreen(true)}
        >
          <span aria-hidden="true">⤢</span>
        </button>
      ) : null}

      {dragging ? (
        <div className={styles.dropHint} aria-hidden="true">
          Drop image to attach
        </div>
      ) : null}

      {fullscreen ? (
        <FullScreenEditor
          value={value}
          onChange={onChange}
          onClose={() => setFullscreen(false)}
          title={label}
        />
      ) : null}
    </div>
  );
}

interface FullScreenEditorProps {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  title: string;
}

function FullScreenEditor({
  value,
  onChange,
  onClose,
  title,
}: FullScreenEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  // On touch, Back should behave exactly like Done: leave the editor, keep text.
  useBackClose(onClose);

  useEffect(() => {
    restoreRef.current = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      restoreRef.current?.focus?.();
    };
  }, [onClose]);

  return (
    <div className={styles.fs} role="dialog" aria-modal="true" aria-label={title}>
      <div className={styles.fsBar}>
        <span className={styles.fsTitle}>{title}</span>
        <button type="button" className={styles.fsDone} onClick={onClose}>
          Done
        </button>
      </div>
      <textarea
        ref={ref}
        className={styles.fsArea}
        value={value}
        placeholder="Keep writing…"
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
