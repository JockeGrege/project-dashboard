import type { Project } from "@/domain";
import { ExternalLink, LinkText, Markdown } from "@/ui";
import styles from "./ProjectDetailsPanel.module.css";

interface ProjectDetailsPanelProps {
  project: Project;
}

/**
 * The expanded "More details" body: the full description, the free-form link
 * list, and Markdown maintenance notes. Rendered only when the project has
 * something to put here.
 */
export function ProjectDetailsPanel({ project }: ProjectDetailsPanelProps) {
  const { description, links, notes } = project;

  return (
    <div className={styles.panel}>
      {description ? (
        <LinkText className={styles.description}>{description}</LinkText>
      ) : null}

      {links.length > 0 ? (
        <ul className={styles.links}>
          {links.map((link, i) => (
            <li key={i} className={styles.linkItem}>
              <ExternalLink href={link.url}>{link.label}</ExternalLink>
            </li>
          ))}
        </ul>
      ) : null}

      {notes ? (
        <section className={styles.notes} aria-label="Maintenance notes">
          <Markdown>{notes}</Markdown>
        </section>
      ) : null}
    </div>
  );
}
