import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
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
   * Called with any image files found on paste (a screenshot, a copied image).
   * When it fires, the default paste is suppressed; plain-text paste is
   * untouched. Not wired into the full-screen editor.
   */
  onImagePaste?: (files: File[]) => void;
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
  onImagePaste,
}: IssueTextAreaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [fullscreen, setFullscreen] = useState(false);

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
    if (!onImagePaste) return;
    const files = [...e.clipboardData.items]
      .filter((it) => it.kind === "file" && it.type.startsWith("image/"))
      .map((it) => it.getAsFile())
      .filter((f): f is File => f !== null);
    if (files.length === 0) return; // let plain-text paste through untouched
    e.preventDefault();
    onImagePaste(files);
  };

  return (
    <div className={styles.wrap}>
      <textarea
        ref={ref}
        className={styles.area}
        data-variant={variant}
        style={{ minHeight: `${minRows * 1.5}em` }}
        rows={minRows}
        placeholder={placeholder}
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
      />
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
