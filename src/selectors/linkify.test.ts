import { describe, expect, it } from "vitest";
import { hasLink, linkify } from "./linkify";

describe("linkify", () => {
  it("returns a single text segment when there is no URL", () => {
    expect(linkify("just some words")).toEqual([
      { kind: "text", value: "just some words" },
    ]);
  });

  it("splits a URL out of surrounding text", () => {
    expect(linkify("see https://example.com/docs for more")).toEqual([
      { kind: "text", value: "see " },
      {
        kind: "link",
        value: "https://example.com/docs",
        href: "https://example.com/docs",
      },
      { kind: "text", value: " for more" },
    ]);
  });

  it("adds a scheme to a bare www. host", () => {
    const [link] = linkify("www.example.com");
    expect(link).toEqual({
      kind: "link",
      value: "www.example.com",
      href: "https://www.example.com",
    });
  });

  it("peels trailing sentence punctuation off the link", () => {
    expect(linkify("go to https://example.com.")).toEqual([
      { kind: "text", value: "go to " },
      { kind: "link", value: "https://example.com", href: "https://example.com" },
      { kind: "text", value: "." },
    ]);
  });

  it("drops an unbalanced closing paren but keeps a balanced one", () => {
    expect(linkify("(https://example.com)")[1]).toEqual({
      kind: "link",
      value: "https://example.com",
      href: "https://example.com",
    });
    const balanced = linkify("https://en.wikipedia.org/wiki/Foo_(bar)")[0];
    expect(balanced).toEqual({
      kind: "link",
      value: "https://en.wikipedia.org/wiki/Foo_(bar)",
      href: "https://en.wikipedia.org/wiki/Foo_(bar)",
    });
  });

  it("handles several links in one string", () => {
    const out = linkify("a http://one.test b http://two.test");
    expect(out.filter((s) => s.kind === "link").map((s) => s.value)).toEqual([
      "http://one.test",
      "http://two.test",
    ]);
  });

  it("hasLink reflects whether a URL is present", () => {
    expect(hasLink("nothing here")).toBe(false);
    expect(hasLink("ping https://x.test now")).toBe(true);
    expect(hasLink("call www.x.test")).toBe(true);
  });
});
