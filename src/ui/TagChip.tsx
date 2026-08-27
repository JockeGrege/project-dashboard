import { TAG_META, type Tag } from "@/domain";
import styles from "./TagChip.module.css";

interface TagChipProps {
  /** `null` renders the "untagged" chip — outline only, no fill. */
  tag: Tag | null;
  size?: "sm" | "md";
}

/**
 * A tag, always as a filled pill with a label (GitHub-style). This shape is
 * reserved for tags so it can never be confused with a category accent, which
 * only ever appears as an edge rule or a dot.
 */
export function TagChip({ tag, size = "md" }: TagChipProps) {
  if (tag === null) {
    return (
      <span className={styles.chip} data-untagged data-size={size}>
        untagged
      </span>
    );
  }

  const meta = TAG_META[tag];
  return (
    <span
      className={styles.chip}
      data-size={size}
      title={meta.meaning}
      style={{
        color: meta.fgVar,
        background: meta.bgVar,
      }}
    >
      {meta.label}
    </span>
  );
}
