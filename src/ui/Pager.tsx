import styles from "./Pager.module.css";

interface PagerProps {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}

/** Flat-view grid pager. Hidden by the caller when there is only one page. */
export function Pager({ page, pageCount, onChange }: PagerProps) {
  return (
    <div className={styles.pager}>
      <button
        type="button"
        className={styles.arrow}
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        ‹
      </button>
      <span className={styles.count} aria-live="polite">
        {page} / {pageCount}
      </span>
      <button
        type="button"
        className={styles.arrow}
        onClick={() => onChange(page + 1)}
        disabled={page >= pageCount}
        aria-label="Next page"
      >
        ›
      </button>
    </div>
  );
}
