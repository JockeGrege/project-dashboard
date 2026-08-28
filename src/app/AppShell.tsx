import { useCallback, useEffect, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { Button } from "@/ui";
import { QuickAdd } from "@/routes/overlays/QuickAdd";
import { CommandSearch } from "@/routes/overlays/CommandSearch";
import { useToast } from "./toast-context";
import { useInstallPrompt } from "./pwa";
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
  const { canInstall, install } = useInstallPrompt();
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
      <a href="#main" className={styles.skip}>
        Skip to content
      </a>
      <header className={styles.bar}>
        <Link to="/" className={styles.wordmark}>
          <span className={styles.mark} aria-hidden="true">
            ◧
          </span>
          improvements
        </Link>

        <div className={styles.actions}>
          {canInstall ? (
            <button
              type="button"
              className={styles.iconBtn}
              onClick={install}
            >
              <span aria-hidden="true">↓</span> install
            </button>
          ) : null}
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
          <Button
            variant="brass"
            className={styles.addBtn}
            onClick={() => setOverlay("add")}
          >
            <span aria-hidden="true">+</span> Add
          </Button>
        </div>
      </header>

      <main id="main" className={styles.main} tabIndex={-1}>
        <Outlet />
      </main>

      {/* Thumb-reach capture on small screens. The header Add can't be a FAB —
          the header's backdrop-filter traps position:fixed descendants. */}
      <button
        type="button"
        className={styles.fab}
        onClick={() => setOverlay("add")}
        aria-label="Add an issue"
      >
        <span aria-hidden="true">+</span> Add
      </button>

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
