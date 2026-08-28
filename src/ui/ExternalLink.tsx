import type { ReactNode } from "react";
import styles from "./ExternalLink.module.css";

interface ExternalLinkProps {
  href: string;
  /** Visible label. Defaults to the URL's host. */
  children?: ReactNode;
  /** Drop the trailing ↗ (e.g. inside a dense list). */
  hideIcon?: boolean;
  /** Let a long label wrap across lines instead of truncating with an ellipsis. */
  wrap?: boolean;
  className?: string | undefined;
}

/** An outbound link: opens in a new tab, always shows it leaves the app. */
export function ExternalLink({
  href,
  children,
  hideIcon = false,
  wrap = false,
  className,
}: ExternalLinkProps) {
  const label = children ?? hostOf(href);
  return (
    <a
      className={`${styles.link}${className ? ` ${className}` : ""}`}
      href={href}
      target="_blank"
      rel="noreferrer noopener"
    >
      <span className={`${styles.label}${wrap ? ` ${styles.wrap}` : ""}`}>
        {label}
      </span>
      {hideIcon ? null : (
        <span className={styles.icon} aria-hidden="true">
          ↗
        </span>
      )}
      <span className={styles.sr}> (opens in a new tab)</span>
    </a>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}
