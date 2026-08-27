import { useCallback, useEffect, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { Button } from "@/ui";
import { QuickAdd } from "@/routes/overlays/QuickAdd";
import { CommandSearch } from "@/routes/overlays/CommandSearch";
import { useToast } from "./toast-context";
import styles from "./AppShell.module.css";

type Overlay = "none" | "add" | "search";

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return (
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.tagName === "SELECT" ||
    el.isContentEditable
  );
}

export function AppShell() {
  const [overlay, setOverlay] = useState<Overlay>("none");
  const toast = useToast();
  const close = useCallback(() => setOverlay("none"), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOverlay((o) => (o === "search" ? "none" : "search"));
        return;
      }
      if (
        e.key.toLowerCase() === "a" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !isTypingTarget(e.target) &&
        overlay === "none"
      ) {
        e.preventDefault();
        setOverlay("add");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [overlay]);

  return (
    <div className={styles.shell}>
      <header className={styles.bar}>
        <Link to="/" className={styles.wordmark}>
          <span className={styles.mark} aria-hidden="true">
            ◧
          </span>
          improvements
        </Link>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => setOverlay("search")}
            aria-label="Search"
          >
            <span aria-hidden="true">⌕</span>
            <kbd className={styles.kbd}>⌘K</kbd>
          </button>
          <Link to="/settings" className={styles.iconBtn} aria-label="Settings">
            <span aria-hidden="true">⚙</span>
          </Link>
          <Link to="/new" className={styles.newProject}>
            new project
          </Link>
          <Button variant="brass" onClick={() => setOverlay("add")}>
            <span aria-hidden="true">+</span> Add
          </Button>
        </div>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>

      {overlay === "add" ? (
        <QuickAdd
          onClose={close}
          onFiled={(projectName) => toast(`Filed to ${projectName}`)}
        />
      ) : null}
      {overlay === "search" ? <CommandSearch onClose={close} /> : null}
    </div>
  );
}
