import {
  useCallback,
  useEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { useBackClose } from "./back-close";
import styles from "./Modal.module.css";

interface ModalProps {
  onClose: () => void;
  label: string;
  children: ReactNode;
  /** Vertical placement of the panel. Overlays sit near the top; confirms centre. */
  align?: "top" | "center";
  /** `alertdialog` for destructive confirms, `dialog` otherwise. */
  role?: "dialog" | "alertdialog";
  className?: string | undefined;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Is the event target somewhere the user is typing? Then Backspace edits text. */
function isEditableTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable
  );
}

/**
 * Shared overlay shell: a backdrop that closes on outside click or Escape, a
 * focus trap, focus returned to the trigger on close, and a body scroll lock.
 * Panels bring their own styling and enter animation.
 */
export function Modal({
  onClose,
  label,
  children,
  align = "top",
  role = "dialog",
  className,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  // Touch devices lean on Back rather than Escape — make it close the overlay
  // instead of navigating the page underneath.
  useBackClose(onClose);

  useEffect(() => {
    restoreRef.current = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    // Focus the first focusable element (or the panel itself).
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();

    return () => {
      document.body.style.overflow = overflow;
      restoreRef.current?.focus?.();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      // Touch devices have no Escape key: Backspace outside a text field backs
      // out of the overlay (inside one it still deletes a character).
      if (e.key === "Backspace" && !isEditableTarget(e.target)) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const onKeyDown = useCallback((e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab") return;
    const panel = panelRef.current;
    if (!panel) return;
    const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (el) => el.offsetParent !== null,
    );
    if (items.length === 0) {
      e.preventDefault();
      return;
    }
    const first = items[0]!;
    const last = items[items.length - 1]!;
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === panel)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  return (
    <div
      className={`${styles.backdrop} ${
        align === "center" ? styles.center : styles.top
      }`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className={className}
        role={role}
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        {children}
      </div>
    </div>
  );
}
