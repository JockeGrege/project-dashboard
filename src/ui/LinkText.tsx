import { Fragment } from "react";
import { linkify } from "@/selectors";
import styles from "./LinkText.module.css";

interface LinkTextProps {
  /** Plain text; any http(s) or www. URL in it becomes a link. */
  children: string;
  className?: string | undefined;
}

/**
 * Renders a plain string with bare URLs turned into outbound links. No HTML is
 * interpreted — the split happens in the `linkify` selector and every piece is
 * plain text or an anchor.
 */
export function LinkText({ children, className }: LinkTextProps) {
  const segments = linkify(children);
  return (
    <span className={className}>
      {segments.map((seg, i) =>
        seg.kind === "link" ? (
          <a
            key={i}
            className={styles.link}
            href={seg.href}
            target="_blank"
            rel="noreferrer noopener"
          >
            {seg.value}
          </a>
        ) : (
          <Fragment key={i}>{seg.value}</Fragment>
        ),
      )}
    </span>
  );
}
