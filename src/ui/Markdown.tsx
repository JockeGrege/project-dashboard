import { useEffect, useRef, useState } from "react";
import styles from "./Markdown.module.css";

interface MarkdownProps {
  /** CommonMark source. */
  children: string;
  className?: string | undefined;
}

/**
 * Renders Markdown to sanitised HTML. `marked` + `dompurify` are pulled in a
 * separate chunk on first use so they never weigh on the initial load — until
 * they arrive the raw source shows as pre-wrapped text.
 */
export function Markdown({ children, className }: MarkdownProps) {
  const [html, setHtml] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [{ marked }, { default: DOMPurify }] = await Promise.all([
        import("marked"),
        import("dompurify"),
      ]);
      const raw = marked.parse(children, { async: false, breaks: true });
      const clean = DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });
      if (!cancelled) setHtml(clean);
    })();
    return () => {
      cancelled = true;
    };
  }, [children]);

  // Force every rendered link to open safely in a new tab.
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    for (const a of el.querySelectorAll("a[href]")) {
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noreferrer noopener");
    }
  }, [html]);

  const classes = `${styles.prose}${className ? ` ${className}` : ""}`;

  if (html === null) {
    return <div className={`${classes} ${styles.pending}`}>{children}</div>;
  }
  return (
    <div
      ref={bodyRef}
      className={classes}
      // Sanitised by DOMPurify immediately above.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
