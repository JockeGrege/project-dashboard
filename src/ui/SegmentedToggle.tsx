import styles from "./SegmentedToggle.module.css";

interface Segment<T extends string> {
  value: T;
  label: string;
}

interface SegmentedToggleProps<T extends string> {
  segments: ReadonlyArray<Segment<T>>;
  value: T;
  onChange: (value: T) => void;
  label: string;
}

/** A small two-or-three-way switch. Used for the flat/category view toggle. */
export function SegmentedToggle<T extends string>({
  segments,
  value,
  onChange,
  label,
}: SegmentedToggleProps<T>) {
  return (
    <div className={styles.group} role="group" aria-label={label}>
      {segments.map((seg) => (
        <button
          key={seg.value}
          type="button"
          className={styles.segment}
          data-active={seg.value === value}
          aria-pressed={seg.value === value}
          onClick={() => onChange(seg.value)}
        >
          {seg.label}
        </button>
      ))}
    </div>
  );
}
