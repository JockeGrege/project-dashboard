import { Link } from "react-router-dom";
import styles from "./NewProjectTile.module.css";

/**
 * The "add a project" affordance, shaped like a project card so it reads as part
 * of the grid. Deliberately quiet — brass is reserved for capturing an issue,
 * the frequent action; setting up a new project is rare.
 */
export function NewProjectTile() {
  return (
    <Link to="/new" className={styles.tile}>
      <span className={styles.plus} aria-hidden="true">
        +
      </span>
      <span className={styles.label}>New project</span>
    </Link>
  );
}
