import { describe, expect, it } from "vitest";
import { createFakeImageUploader } from "./fake-image-uploader";

const png = () => new File([new Uint8Array([1, 2, 3])], "shot.png", { type: "image/png" });

describe("createFakeImageUploader", () => {
  it("resolves to a well-formed https URL", async () => {
    const uploader = createFakeImageUploader({ delayMs: 0 });
    await expect(uploader.upload(png())).resolves.toMatch(/^https:\/\//);
  });

  it("rejects when told to fail", async () => {
    const uploader = createFakeImageUploader({ delayMs: 0, fail: "nope" });
    await expect(uploader.upload(png())).rejects.toThrow("nope");
  });

  it("failOnce rejects the first upload, then succeeds", async () => {
    const uploader = createFakeImageUploader({ delayMs: 0, failOnce: "flaky" });
    await expect(uploader.upload(png())).rejects.toThrow("flaky");
    await expect(uploader.upload(png())).resolves.toMatch(/^https:\/\//);
  });

  it("rejects with AbortError when the signal is already aborted", async () => {
    const uploader = createFakeImageUploader({ delayMs: 10 });
    await expect(
      uploader.upload(png(), AbortSignal.abort()),
    ).rejects.toMatchObject({ name: "AbortError" });
  });

  it("rejects with AbortError when aborted mid-flight", async () => {
    const uploader = createFakeImageUploader({ delayMs: 50 });
    const ac = new AbortController();
    const p = uploader.upload(png(), ac.signal);
    ac.abort();
    await expect(p).rejects.toMatchObject({ name: "AbortError" });
  });
});
