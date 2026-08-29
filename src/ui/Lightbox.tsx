import { useEffect } from "react";
import { Modal } from "./Modal";
import styles from "./Lightbox.module.css";

interface LightboxProps {
  urls: readonly string[];
  /** Which image to show. Clamped into range. */
  index: number;
  onClose: () => void;
  /** Move to another image (Prev/Next, arrow keys). Omit for a single image. */
  onIndexChange?: (index: number) => void;
}

/** A full-bleed view of one attached image, on top of the shared `Modal` shell. */
export function Lightbox({ urls, index, onClose, onIndexChange }: LightboxProps) {
  const count = urls.length;
  const safe = count === 0 ? 0 : Math.min(Math.max(index, 0), count - 1);
  const many = count > 1 && !!onIndexChange;

  useEffect(() => {
    if (!many) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        onIndexChange((safe - 1 + count) % count);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        onIndexChange((safe + 1) % count);
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [many, safe, count, onIndexChange]);

  if (count === 0) return null;

  return (
    <Modal
      onClose={onClose}
      label={`Image ${safe + 1} of ${count}`}
      align="center"
      className={styles.panel}
    >
      <img className={styles.image} src={urls[safe]} alt={`Attachment ${safe + 1}`} />

      <button
        type="button"
        className={styles.close}
        aria-label="Close"
        onClick={onClose}
      >
        ×
      </button>

      {many ? (
        <>
          <button
            type="button"
            className={`${styles.nav} ${styles.prev}`}
            aria-label="Previous image"
            onClick={() => onIndexChange((safe - 1 + count) % count)}
          >
            ‹
          </button>
          <button
            type="button"
            className={`${styles.nav} ${styles.next}`}
            aria-label="Next image"
            onClick={() => onIndexChange((safe + 1) % count)}
          >
            ›
          </button>
          <span className={styles.counter}>
            {safe + 1} / {count}
          </span>
        </>
      ) : null}
    </Modal>
  );
}
