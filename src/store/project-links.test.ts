import { describe, expect, it } from "vitest";
import { normaliseText, sanitizeLinks } from "./project-links";

describe("normaliseText", () => {
  it("trims and collapses blank to null", () => {
    expect(normaliseText("  hi  ", 100)).toBe("hi");
    expect(normaliseText("   ", 100)).toBeNull();
    expect(normaliseText(null, 100)).toBeNull();
    expect(normaliseText(undefined, 100)).toBeNull();
  });

  it("clamps to the max length", () => {
    expect(normaliseText("abcdef", 3)).toBe("abc");
  });
});

describe("sanitizeLinks", () => {
  it("keeps well-formed entries and trims them", () => {
    expect(
      sanitizeLinks([{ label: "  Console ", url: " https://example.com " }]),
    ).toEqual([{ label: "Console", url: "https://example.com" }]);
  });

  it("drops entries with a missing label or an unparseable url", () => {
    expect(
      sanitizeLinks([
        { label: "", url: "https://example.com" },
        { label: "Docs", url: "not a url" },
        { label: "Good", url: "https://ok.test" },
        "nonsense",
        null,
      ]),
    ).toEqual([{ label: "Good", url: "https://ok.test" }]);
  });

  it("returns an empty array for non-array input", () => {
    expect(sanitizeLinks(undefined)).toEqual([]);
    expect(sanitizeLinks("https://x.test")).toEqual([]);
  });

  it("caps the list at 40 entries", () => {
    const many = Array.from({ length: 60 }, (_, i) => ({
      label: `L${i}`,
      url: `https://x${i}.test`,
    }));
    expect(sanitizeLinks(many)).toHaveLength(40);
  });
});
