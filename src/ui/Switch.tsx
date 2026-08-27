import { useId } from "react";
import styles from "./Switch.module.css";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

/** A labelled on/off switch, e.g. the feed's "show resolved". */
export function Switch({ checked, onChange, label }: SwitchProps) {
  const id = useId();
  return (
    <span className={styles.wrap}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        className={styles.track}
        data-on={checked}
        onClick={() => onChange(!checked)}
      >
        <span className={styles.thumb} />
      </button>
    </span>
  );
}
