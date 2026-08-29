import { describe, expect, it } from "vitest";
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

const uploading = (id: string): Attachment => ({
  id,
  name: `${id}.png`,
  localUrl: `blob:${id}`,
  status: "uploading",
});

describe("validateFile", () => {
  const file = (type: string, size: number) =>
    ({ type, size, name: "x" }) as File;

  it("passes an image within the size limit", () => {
    expect(validateFile(file("image/png", 1_000))).toBeNull();
  });

  it("rejects a non-image", () => {
    expect(validateFile(file("application/pdf", 10))).toBe("Not an image");
  });

  it("rejects an oversize image", () => {
    expect(validateFile(file("image/png", 33 * 1024 * 1024))).toBe("Over 32 MB");
  });
});

describe("attachment-list transitions", () => {
  it("markDone sets status and url", () => {
    const next = markDone([uploading("a")], "a", "https://x/a.png");
    expect(next[0]!).toMatchObject({ status: "done", url: "https://x/a.png" });
    expect(next[0]!.error).toBeUndefined();
  });

  it("markError sets status and message", () => {
    const next = markError([uploading("a")], "a", "boom");
    expect(next[0]!).toMatchObject({ status: "error", error: "boom" });
  });

  it("markRetrying clears the error and goes back to uploading", () => {
    const errored = markError([uploading("a")], "a", "boom");
    const next = markRetrying(errored, "a");
    expect(next[0]!).toMatchObject({ status: "uploading" });
    expect(next[0]!.error).toBeUndefined();
  });

  it("removeEntry drops the matching id", () => {
    expect(removeEntry([uploading("a"), uploading("b")], "a").map((x) => x.id)).toEqual(["b"]);
  });

  it("leaves other entries untouched", () => {
    const list = [uploading("a"), uploading("b")];
    const next = markDone(list, "a", "https://x/a.png");
    expect(next[1]).toBe(list[1]);
  });
});

describe("derived selectors", () => {
  const done = (id: string): Attachment => ({
    id,
    name: id,
    localUrl: `blob:${id}`,
    status: "done",
    url: `https://x/${id}.png`,
  });
  const errored = (id: string): Attachment => ({
    id,
    name: id,
    localUrl: `blob:${id}`,
    status: "error",
    error: "no",
  });

  it("isUploading / hasError reflect the list", () => {
    expect(isUploading([done("a"), uploading("b")])).toBe(true);
    expect(isUploading([done("a")])).toBe(false);
    expect(hasError([done("a"), errored("b")])).toBe(true);
    expect(hasError([done("a")])).toBe(false);
  });

  it("doneUrls returns only completed URLs, in order", () => {
    expect(doneUrls([done("a"), uploading("b"), done("c"), errored("d")])).toEqual([
      "https://x/a.png",
      "https://x/c.png",
    ]);
  });

  it("remainingSlots counts down from the cap", () => {
    expect(remainingSlots([])).toBe(8);
    expect(remainingSlots([uploading("a"), uploading("b")])).toBe(6);
    expect(remainingSlots(Array.from({ length: 10 }, (_, i) => uploading(`x${i}`)))).toBe(0);
  });
});
