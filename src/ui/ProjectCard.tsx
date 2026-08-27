import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { MonogramAvatar } from "./MonogramAvatar";
import styles from "./ProjectCard.module.css";

interface ProjectCardProps {
  name: string;
  to: string;
  /** Category accent, shown as a corner dot. Omit in category view (the bay edge carries it). */
  accent?: string | null;
  repoHost?: string | null;
  hostMachine?: string | null;
  /** Position in its grid — drives the page-load stagger. */
  index?: number;
  /** Stable name for the flat↔category view transition. */
  transitionName?: string;
}

/** A monogram tile in the project grid. */
export function ProjectCard({
  name,
  to,
  accent,
  repoHost,
  hostMachine,
  index = 0,
  transitionName,
}: ProjectCardProps) {
  const meta = [repoHost, hostMachine].filter(Boolean).join(" · ");
  const style: Record<string, string> = {
    "--enter-delay": `${Math.min(index, 12) * 18}ms`,
  };
  if (accent) style["--card-accent"] = accent;
  if (transitionName) style.viewTransitionName = transitionName;

  return (
    <Link to={to} className={styles.card} style={style as CSSProperties}>
      {accent ? <span className={styles.dot} aria-hidden="true" /> : null}
      <MonogramAvatar name={name} size="lg" />
      <span className={styles.foot}>
        <span className={styles.name}>{name}</span>
        {meta ? <span className={styles.meta}>{meta}</span> : null}
      </span>
    </Link>
  );
}
