import { describe, expect, it } from "vitest";
import { issueSchema } from "@/domain";
import { sanitizeImageUrls } from "./attachments";

describe("sanitizeImageUrls", () => {
  it("keeps well-formed http(s) URLs in order", () => {
    expect(
      sanitizeImageUrls([
        "https://i.ibb.co/a.png",
        "http://example.com/b.jpg",
      ]),
    ).toEqual(["https://i.ibb.co/a.png", "http://example.com/b.jpg"]);
  });

  it("trims, drops non-strings, junk, and non-http schemes", () => {
    expect(
      sanitizeImageUrls([
        "  https://i.ibb.co/a.png  ",
        42,
        null,
        "ftp://x/y.png",
        "data:image/png;base64,AAAA",
        "just text",
      ]),
    ).toEqual(["https://i.ibb.co/a.png"]);
  });

  it("de-duplicates", () => {
    expect(
      sanitizeImageUrls(["https://x/a.png", "https://x/a.png", "https://x/b.png"]),
    ).toEqual(["https://x/a.png", "https://x/b.png"]);
  });

  it("caps the list at 8", () => {
    const many = Array.from({ length: 20 }, (_, i) => `https://x/${i}.png`);
    expect(sanitizeImageUrls(many)).toHaveLength(8);
  });

  it("returns [] for a non-array", () => {
    expect(sanitizeImageUrls("nope")).toEqual([]);
    expect(sanitizeImageUrls(undefined)).toEqual([]);
  });
});

describe("issueSchema.attachments", () => {
  const base = {
    id: "i1",
    projectId: "p1",
    text: "t",
    tag: null,
    status: "open" as const,
    createdAt: 0,
    updatedAt: 0,
    resolvedAt: null,
    deletedAt: null,
  };

  it("defaults to an empty array when omitted", () => {
    expect(issueSchema.parse(base).attachments).toEqual([]);
  });

  it("accepts a list of URLs", () => {
    const parsed = issueSchema.parse({
      ...base,
      attachments: ["https://i.ibb.co/a.png"],
    });
    expect(parsed.attachments).toEqual(["https://i.ibb.co/a.png"]);
  });

  it("rejects a non-URL entry", () => {
    expect(() =>
      issueSchema.parse({ ...base, attachments: ["nope"] }),
    ).toThrow();
  });

  it("rejects more than 8", () => {
    const many = Array.from({ length: 9 }, (_, i) => `https://x/${i}.png`);
    expect(() => issueSchema.parse({ ...base, attachments: many })).toThrow();
  });
});
