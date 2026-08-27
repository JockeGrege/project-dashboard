import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import styles from "./Popover.module.css";

interface PopoverProps {
  /** Rendered as the trigger button's contents. */
  trigger: ReactNode;
  triggerLabel: string;
  /** Receives a `close` callback so menu items can dismiss the popover. */
  children: (close: () => void) => ReactNode;
  align?: "start" | "end";
}

/** A click-outside/Escape-dismissed floating panel anchored to a trigger. */
export function Popover({
  trigger,
  triggerLabel,
  children,
  align = "end",
}: PopoverProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={triggerLabel}
        onClick={() => setOpen((v) => !v)}
      >
        {trigger}
      </button>
      {open ? (
        <div id={id} className={styles.panel} data-align={align} role="menu">
          {children(() => setOpen(false))}
        </div>
      ) : null}
    </div>
  );
}
