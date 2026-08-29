import { MAX_ATTACHMENTS } from "@/domain";

/**
 * The pure state of the composer's attachment strip: a list of `Attachment`s and
 * the transitions between their three states. No React, no `URL.createObjectURL`,
 * no `fetch` — `use-issue-attachments` owns those side effects and drives this.
 */

export type AttachmentStatus = "uploading" | "done" | "error";

export interface Attachment {
  /** Stable local id (not the issue id). */
  id: string;
  /** Original file name, for the alt text and title. */
  name: string;
  /** Object URL of the local file — an instant preview while (and after) it uploads. */
  localUrl: string;
  status: AttachmentStatus;
  /** The hosted URL. Present iff `status === "done"`. */
  url?: string;
  /** Why it failed, safe to show. Present iff `status === "error"`. */
  error?: string;
}

/** imgbb's per-image ceiling. */
export const MAX_IMAGE_BYTES = 32 * 1024 * 1024;

/** `null` if the file may be uploaded, otherwise a short reason it may not. */
export function validateFile(file: File, maxBytes = MAX_IMAGE_BYTES): string | null {
  if (!file.type.startsWith("image/")) return "Not an image";
  if (file.size > maxBytes) return "Over 32 MB";
  return null;
}

export function remainingSlots(
  list: readonly Attachment[],
  max = MAX_ATTACHMENTS,
): number {
  return Math.max(0, max - list.length);
}

export function isUploading(list: readonly Attachment[]): boolean {
  return list.some((a) => a.status === "uploading");
}

export function hasError(list: readonly Attachment[]): boolean {
  return list.some((a) => a.status === "error");
}

/** The hosted URLs to file with the issue, in list order. */
export function doneUrls(list: readonly Attachment[]): string[] {
  return list.flatMap((a) => (a.status === "done" && a.url ? [a.url] : []));
}

export function markDone(
  list: readonly Attachment[],
  id: string,
  url: string,
): Attachment[] {
  return list.map((a) =>
    a.id === id
      ? { id: a.id, name: a.name, localUrl: a.localUrl, status: "done", url }
      : a,
  );
}

export function markError(
  list: readonly Attachment[],
  id: string,
  error: string,
): Attachment[] {
  return list.map((a) =>
    a.id === id
      ? { id: a.id, name: a.name, localUrl: a.localUrl, status: "error", error }
      : a,
  );
}

/** Back to `uploading` with the error cleared — the start of a retry. */
export function markRetrying(
  list: readonly Attachment[],
  id: string,
): Attachment[] {
  return list.map((a) =>
    a.id === id
      ? { id: a.id, name: a.name, localUrl: a.localUrl, status: "uploading" }
      : a,
  );
}

export function removeEntry(
  list: readonly Attachment[],
  id: string,
): Attachment[] {
  return list.filter((a) => a.id !== id);
}
