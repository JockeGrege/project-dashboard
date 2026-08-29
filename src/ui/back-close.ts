import { useEffect, useRef } from "react";

/**
 * Lets the device Back button (and the Android back gesture) dismiss an overlay
 * instead of navigating the page beneath it. Each open overlay pushes a
 * throwaway history entry; a `popstate` (Back) runs the topmost overlay's
 * `onClose`. Closing an overlay any other way — Escape, a button, an outside
 * click — rewinds that same entry, so a later Back isn't left with a silent
 * no-op to swallow first.
 *
 * One shared `popstate` listener plus an explicit stack keeps nested overlays
 * honest: Back closes the top one, not all of them.
 *
 * The entry is pushed synchronously on open so Back is intercepted immediately.
 * React's StrictMode double-mount in development is absorbed by deferring the
 * teardown rewind a tick: a remount that lands before it fires cancels the
 * rewind and reuses the entry the teardown left in place, so `history` never
 * churns.
 */

const MARK = "__overlayBack";

interface Entry {
  close: () => void;
}

const stack: Entry[] = [];
/** Rewinds we triggered ourselves, ignored when they arrive back as popstate. */
let selfPops = 0;
let pendingRewind: ReturnType<typeof setTimeout> | null = null;
let listening = false;

function onPopState(): void {
  if (selfPops > 0) {
    selfPops -= 1;
    return;
  }
  const top = stack.pop();
  if (top) top.close();
}

function hasMark(state: unknown): boolean {
  return (
    typeof state === "object" &&
    state !== null &&
    (state as Record<string, unknown>)[MARK] === true
  );
}

export function useBackClose(onClose: () => void): void {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (pendingRewind !== null) {
      // A StrictMode remount beat the teardown's rewind — keep its entry.
      clearTimeout(pendingRewind);
      pendingRewind = null;
    } else {
      if (!listening) {
        window.addEventListener("popstate", onPopState);
        listening = true;
      }
      window.history.pushState({ ...window.history.state, [MARK]: true }, "");
    }

    const entry: Entry = { close: () => onCloseRef.current() };
    stack.push(entry);

    return () => {
      const i = stack.lastIndexOf(entry);
      if (i !== -1) stack.splice(i, 1);
      // Closed by something other than Back: consume the entry we pushed, a tick
      // later so a StrictMode remount can cancel it. Skip when a navigation
      // already replaced our entry — its state no longer carries MARK.
      if (i !== -1 && hasMark(window.history.state)) {
        pendingRewind = setTimeout(() => {
          pendingRewind = null;
          selfPops += 1;
          window.history.back();
        }, 0);
      }
    };
  }, []);
}
