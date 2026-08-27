import { PROJECT_SORTS, type ProjectSort } from "@/domain";
import styles from "./SortMenu.module.css";

const LABELS: Record<ProjectSort, string> = {
  name: "name",
  added: "date added",
  activity: "last activity",
};

interface SortMenuProps {
  value: ProjectSort;
  onChange: (value: ProjectSort) => void;
}

/** Grid sort control. A native select, restyled — keyboard and screen readers for free. */
export function SortMenu({ value, onChange }: SortMenuProps) {
  return (
    <label className={styles.wrap}>
      <span className={styles.eyebrow}>sort</span>
      <select
        className={styles.select}
        value={value}
        onChange={(e) => onChange(e.target.value as ProjectSort)}
      >
        {PROJECT_SORTS.map((sort) => (
          <option key={sort} value={sort}>
            {LABELS[sort]}
          </option>
        ))}
      </select>
    </label>
  );
}
