import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ToastContext, type ToastFn } from "./toast-context";
import styles from "./toast.module.css";

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const timers = useRef<number[]>([]);

  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const toast = useCallback<ToastFn>((next) => {
    clear();
    setMessage(next);
    setVisible(true);
    timers.current.push(
      window.setTimeout(() => setVisible(false), 2400),
      window.setTimeout(() => setMessage(null), 2700),
    );
  }, []);

  useEffect(() => clear, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {message !== null ? (
        <div
          className={styles.toast}
          data-visible={visible}
          role="status"
          aria-live="polite"
        >
          {message}
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}
