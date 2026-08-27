import { monogram } from "@/selectors";
import styles from "./MonogramAvatar.module.css";

interface MonogramAvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
}

/** A label-maker monogram derived from the project name. Never an uploaded image. */
export function MonogramAvatar({ name, size = "md" }: MonogramAvatarProps) {
  return (
    <span className={styles.avatar} data-size={size} aria-hidden="true">
      {monogram(name)}
    </span>
  );
}
