import type { ReactNode } from "react";
import styles from "./Eyebrow.module.css";

/** A mono uppercase section label. The text should state a real fact about the section. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className={styles.eyebrow}>{children}</p>;
}
