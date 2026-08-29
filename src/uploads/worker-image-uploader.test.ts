import { afterEach, describe, expect, it, vi } from "vitest";
import { createWorkerImageUploader } from "./worker-image-uploader";

const ENDPOINT = "https://worker.example.dev/";
const png = () => new File([new Uint8Array([1, 2, 3])], "shot.png", { type: "image/png" });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createWorkerImageUploader", () => {
  it("POSTs multipart form data to the endpoint and returns the url", async () => {
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toBe(ENDPOINT);
      expect(init.method).toBe("POST");
      expect(init.body).toBeInstanceOf(FormData);
      expect((init.body as FormData).get("image")).toBeInstanceOf(File);
      return new Response(JSON.stringify({ url: "https://i.ibb.co/XXXX/x.png" }), {
        status: 200,
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const uploader = createWorkerImageUploader(ENDPOINT);
    await expect(uploader.upload(png())).resolves.toBe("https://i.ibb.co/XXXX/x.png");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("throws the server's error message on a non-2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: "Image is over 32 MB." }), {
            status: 400,
          }),
      ),
    );
    const uploader = createWorkerImageUploader(ENDPOINT);
    await expect(uploader.upload(png())).rejects.toThrow("Image is over 32 MB.");
  });

  it("throws on a malformed body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("not json", { status: 200 })),
    );
    const uploader = createWorkerImageUploader(ENDPOINT);
    await expect(uploader.upload(png())).rejects.toThrow(/upload failed/i);
  });

  it("surfaces a network failure as a readable error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    const uploader = createWorkerImageUploader(ENDPOINT);
    await expect(uploader.upload(png())).rejects.toThrow(/couldn't reach/i);
  });

  it("propagates an abort", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new DOMException("Aborted", "AbortError");
      }),
    );
    const uploader = createWorkerImageUploader(ENDPOINT);
    await expect(
      uploader.upload(png(), new AbortController().signal),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});
