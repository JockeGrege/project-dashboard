import { describe, expect, it } from "vitest";
import { monogram } from "./monogram";

describe("monogram", () => {
  it.each([
    ["dashboard", "DA"],
    ["core", "CO"],
    ["a", "A"],
    ["", "?"],
    ["Project Improvement Tracker", "PI"],
    ["for fun", "FF"],
    ["pdf-kit", "PK"],
    ["my.notes.app", "MN"],
    ["  spaced   out  ", "SO"],
    ["3d-printer", "3P"],
    ["!!!", "?"],
    ["über-tool", "ÜT"],
    ["émigré", "ÉM"],
  ])("%j -> %j", (input, expected) => {
    expect(monogram(input)).toBe(expected);
  });

  it("uppercases single-word two-letter output", () => {
    expect(monogram("sync")).toBe("SY");
  });
});
