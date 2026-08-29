import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ImageUploaderProvider } from "./provider";
import { createFakeImageUploader } from "./fake-image-uploader";
import { useIssueAttachments } from "./use-issue-attachments";
import type { ImageUploader } from "./image-uploader";

const png = (name = "shot.png", bytes = 3) =>
  new File([new Uint8Array(bytes)], name, { type: "image/png" });

// A File-shaped stand-in with an arbitrary reported size (no big allocation).
const oversizePng = (name: string, size: number) =>
  ({ name, type: "image/png", size }) as File;

const wrapper = (uploader: ImageUploader) =>
  function Wrap({ children }: { children: ReactNode }) {
    return (
      <ImageUploaderProvider uploader={uploader}>{children}</ImageUploaderProvider>
    );
  };

const render = (uploader: ImageUploader) =>
  renderHook(() => useIssueAttachments(), { wrapper: wrapper(uploader) });

describe("useIssueAttachments", () => {
  it("adds a file, shows it uploading, then done with a URL", async () => {
    const { result } = render(createFakeImageUploader({ delayMs: 10 }));

    act(() => result.current.addFiles([png()]));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]!.status).toBe("uploading");
    expect(result.current.isUploading).toBe(true);
    expect(result.current.urls).toEqual([]);

    await waitFor(() => expect(result.current.items[0]!.status).toBe("done"));
    expect(result.current.isUploading).toBe(false);
    expect(result.current.hasError).toBe(false);
    expect(result.current.urls).toHaveLength(1);
    expect(result.current.urls[0]).toMatch(/^https:\/\//);
  });

  it("marks a failed upload as an error, then recovers on retry", async () => {
    const { result } = render(
      createFakeImageUploader({ delayMs: 5, failOnce: "flaky link" }),
    );

    act(() => result.current.addFiles([png()]));
    await waitFor(() => expect(result.current.items[0]!.status).toBe("error"));
    expect(result.current.items[0]!.error).toBe("flaky link");
    expect(result.current.hasError).toBe(true);
    expect(result.current.urls).toEqual([]);

    const id = result.current.items[0]!.id;
    act(() => result.current.retry(id));
    expect(result.current.items[0]!.status).toBe("uploading");

    await waitFor(() => expect(result.current.items[0]!.status).toBe("done"));
    expect(result.current.hasError).toBe(false);
    expect(result.current.urls).toHaveLength(1);
  });

  it("rejects an oversize file immediately, without calling the uploader", async () => {
    const { result } = render(createFakeImageUploader({ delayMs: 0 }));

    act(() => result.current.addFiles([oversizePng("huge.png", 33 * 1024 * 1024)]));
    expect(result.current.items[0]!.status).toBe("error");
    expect(result.current.items[0]!.error).toBe("Over 32 MB");
    expect(result.current.hasError).toBe(true);
  });

  it("removes one attachment", async () => {
    const { result } = render(createFakeImageUploader({ delayMs: 0 }));

    act(() => result.current.addFiles([png("a.png"), png("b.png")]));
    await waitFor(() => expect(result.current.urls).toHaveLength(2));

    const firstId = result.current.items[0]!.id;
    act(() => result.current.remove(firstId));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]!.name).toBe("b.png");
  });

  it("reset clears everything after the issue is filed", async () => {
    const { result } = render(createFakeImageUploader({ delayMs: 0 }));

    act(() => result.current.addFiles([png()]));
    await waitFor(() => expect(result.current.urls).toHaveLength(1));

    act(() => result.current.reset());
    expect(result.current.items).toEqual([]);
    expect(result.current.urls).toEqual([]);
    expect(result.current.isUploading).toBe(false);
    expect(result.current.hasError).toBe(false);
  });

  it("caps the list at 8", async () => {
    const { result } = render(createFakeImageUploader({ delayMs: 0 }));

    act(() =>
      result.current.addFiles(
        Array.from({ length: 12 }, (_, i) => png(`f${i}.png`)),
      ),
    );
    expect(result.current.items).toHaveLength(8);
  });
});
