import type { ButtonHTMLAttributes } from "react";
import styles from "./MenuItem.module.css";

interface MenuItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: "default" | "danger";
}

export function MenuItem({ tone = "default", ...rest }: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      className={styles.item}
      data-tone={tone}
      {...rest}
    />
  );
}

export function MenuSeparator() {
  return <span className={styles.separator} role="separator" />;
}

export function MenuLabel({ children }: { children: string }) {
  return <span className={styles.label}>{children}</span>;
}
