import { describe, expect, it } from "vitest";
import { relativeTime } from "./relative-time";

const NOW = Date.UTC(2026, 7, 28, 12, 0, 0);
const sec = (n: number) => NOW - n * 1000;
const min = (n: number) => NOW - n * 60_000;
const hr = (n: number) => NOW - n * 3_600_000;
const day = (n: number) => NOW - n * 86_400_000;

describe("relativeTime", () => {
  it.each([
    [NOW, "now"],
    [sec(5), "now"],
    [sec(59), "now"],
    [min(1), "1m"],
    [min(9), "9m"],
    [min(59), "59m"],
    [hr(1), "1h"],
    [hr(23), "23h"],
    [day(1), "1d"],
    [day(6), "6d"],
    [day(7), "1w"],
    [day(29), "4w"],
    [day(30), "1mo"],
    [day(364), "12mo"],
    [day(365), "1y"],
    [day(900), "2y"],
  ])("%d -> %s", (ts, expected) => {
    expect(relativeTime(ts, NOW)).toBe(expected);
  });

  it("clamps future timestamps to now", () => {
    expect(relativeTime(NOW + 999_999, NOW)).toBe("now");
  });
});
