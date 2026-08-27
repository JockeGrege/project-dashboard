import { useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { Button } from "@/ui";
import { QuickAdd } from "@/routes/overlays/QuickAdd";
import { useToast } from "./toast-context";
import styles from "./AppShell.module.css";

export function AppShell() {
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const toast = useToast();

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
          <Link to="/new" className={styles.newProject}>
            new project
          </Link>
          <Button variant="brass" onClick={() => setQuickAddOpen(true)}>
            <span aria-hidden="true">+</span> Add
          </Button>
        </div>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>

      {quickAddOpen ? (
        <QuickAdd
          onClose={() => setQuickAddOpen(false)}
          onFiled={(projectName) => toast(`Filed to ${projectName}`)}
        />
      ) : null}
    </div>
  );
}
