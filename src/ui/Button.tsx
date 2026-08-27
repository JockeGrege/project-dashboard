import type { ButtonHTMLAttributes } from "react";
import styles from "./Button.module.css";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** `brass` is the capture affordance — use it once per screen. */
  variant?: "brass" | "ghost" | "quiet";
  size?: "sm" | "md";
}

export function Button({
  variant = "ghost",
  size = "md",
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[styles.button, className].filter(Boolean).join(" ")}
      data-variant={variant}
      data-size={size}
      {...rest}
    />
  );
}
