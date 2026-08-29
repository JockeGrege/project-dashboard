import { useCallback, useEffect, useRef, useState } from "react";
import { MAX_ATTACHMENTS } from "@/domain";
import { useImageUploader } from "./uploader-context";
import {
  doneUrls,
  hasError,
  isUploading,
  markDone,
  markError,
  markRetrying,
  remainingSlots,
  removeEntry,
  validateFile,
  type Attachment,
} from "./attachment-list";

const newId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `att_${Math.random().toString(36).slice(2)}`;

export interface UseIssueAttachments {
  items: Attachment[];
  /** Queue images (from a paste) for upload. Over-cap, non-image, and oversize files are handled. */
  addFiles: (files: File[]) => void;
  /** Re-run a failed upload. */
  retry: (id: string) => void;
  /** Drop one attachment and cancel it if still in flight. */
  remove: (id: string) => void;
  /** Clear everything (call after the issue is filed). */
  reset: () => void;
  /** An upload is in flight — the composer's submit must wait. */
  isUploading: boolean;
  /** At least one upload failed — the composer's submit is blocked until it's retried or removed. */
  hasError: boolean;
  /** Hosted URLs to file with the issue. */
  urls: string[];
}

/**
 * Owns the composer's pending attachments: preview object URLs, one
 * `AbortController` per in-flight upload, and the calls to the `ImageUploader`
 * seam. The pure transitions live in `attachment-list.ts`; this is only the
 * side-effecting shell. Shared by `IssueComposer` and `QuickAdd`.
 */
export function useIssueAttachments(): UseIssueAttachments {
  const uploader = useImageUploader();
  const [items, setItems] = useState<Attachment[]>([]);

  const controllers = useRef(new Map<string, AbortController>());
  const files = useRef(new Map<string, File>());
  const itemsRef = useRef<Attachment[]>([]);
  itemsRef.current = items;

  const startUpload = useCallback(
    (id: string, file: File) => {
      const ac = new AbortController();
      controllers.current.set(id, ac);
      uploader
        .upload(file, ac.signal)
        .then((url) => {
          setItems((list) => markDone(list, id, url));
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          const message = err instanceof Error ? err.message : "Upload failed.";
          setItems((list) => markError(list, id, message));
        })
        .finally(() => {
          controllers.current.delete(id);
        });
    },
    [uploader],
  );

  const addFiles = useCallback(
    (incoming: File[]) => {
      let slots = remainingSlots(itemsRef.current, MAX_ATTACHMENTS);
      for (const file of incoming) {
        if (slots <= 0) break;
        slots -= 1;
        const id = newId();
        const localUrl = URL.createObjectURL(file);
        const reason = validateFile(file);
        if (reason) {
          setItems((list) => [
            ...list,
            { id, name: file.name || "image", localUrl, status: "error", error: reason },
          ]);
          continue;
        }
        files.current.set(id, file);
        setItems((list) => [
          ...list,
          { id, name: file.name || "image", localUrl, status: "uploading" },
        ]);
        startUpload(id, file);
      }
    },
    [startUpload],
  );

  const retry = useCallback(
    (id: string) => {
      const file = files.current.get(id);
      if (!file) return;
      setItems((list) => markRetrying(list, id));
      startUpload(id, file);
    },
    [startUpload],
  );

  const remove = useCallback((id: string) => {
    controllers.current.get(id)?.abort();
    controllers.current.delete(id);
    files.current.delete(id);
    const gone = itemsRef.current.find((a) => a.id === id);
    if (gone) URL.revokeObjectURL(gone.localUrl);
    setItems((list) => removeEntry(list, id));
  }, []);

  const reset = useCallback(() => {
    for (const ac of controllers.current.values()) ac.abort();
    controllers.current.clear();
    files.current.clear();
    for (const a of itemsRef.current) URL.revokeObjectURL(a.localUrl);
    setItems([]);
  }, []);

  // Unmount: cancel everything still in flight and release every preview URL.
  useEffect(
    () => () => {
      for (const ac of controllers.current.values()) ac.abort();
      for (const a of itemsRef.current) URL.revokeObjectURL(a.localUrl);
    },
    [],
  );

  return {
    items,
    addFiles,
    retry,
    remove,
    reset,
    isUploading: isUploading(items),
    hasError: hasError(items),
    urls: doneUrls(items),
  };
}
