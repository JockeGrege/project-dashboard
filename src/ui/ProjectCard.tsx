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
}

/** A monogram tile in the project grid. */
export function ProjectCard({
  name,
  to,
  accent,
  repoHost,
  hostMachine,
}: ProjectCardProps) {
  const meta = [repoHost, hostMachine].filter(Boolean).join(" · ");
  const style = accent
    ? ({ "--card-accent": accent } as CSSProperties)
    : undefined;

  return (
    <Link to={to} className={styles.card} style={style}>
      {accent ? <span className={styles.dot} aria-hidden="true" /> : null}
      <MonogramAvatar name={name} size="lg" />
      <span className={styles.foot}>
        <span className={styles.name}>{name}</span>
        {meta ? <span className={styles.meta}>{meta}</span> : null}
      </span>
    </Link>
  );
}
