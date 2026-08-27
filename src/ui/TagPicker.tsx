import { TAG_LIST, type Tag } from "@/domain";
import styles from "./TagPicker.module.css";

interface TagPickerProps {
  value: Tag | null;
  onChange: (tag: Tag | null) => void;
  /** Show an explicit "none" option to clear a tag. Off in capture flows where "no selection" already means none. */
  allowClear?: boolean;
  size?: "sm" | "md";
}

/** The shared tag selector: four chips, single-select, optional. */
export function TagPicker({
  value,
  onChange,
  allowClear = false,
  size = "md",
}: TagPickerProps) {
  return (
    <div className={styles.row} data-size={size} role="group" aria-label="Tag">
      {TAG_LIST.map((meta) => {
        const active = value === meta.tag;
        return (
          <button
            key={meta.tag}
            type="button"
            className={styles.chip}
            data-active={active}
            aria-pressed={active}
            title={meta.meaning}
            style={{ color: meta.fgVar, background: meta.bgVar }}
            onClick={() => onChange(active ? null : meta.tag)}
          >
            {meta.label}
          </button>
        );
      })}
      {allowClear ? (
        <button
          type="button"
          className={styles.none}
          data-active={value === null}
          aria-pressed={value === null}
          onClick={() => onChange(null)}
        >
          none
        </button>
      ) : null}
    </div>
  );
}
