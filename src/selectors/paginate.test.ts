import { describe, expect, it } from "vitest";
import { paginate } from "./paginate";

const items = [1, 2, 3, 4, 5, 6, 7];

describe("paginate", () => {
  it("slices a middle page", () => {
    expect(paginate(items, 3, 2)).toEqual({
      slice: [4, 5, 6],
      pageCount: 3,
      page: 2,
    });
  });

  it("returns a short final page", () => {
    expect(paginate(items, 3, 3).slice).toEqual([7]);
  });

  it("clamps a page past the end to the last page", () => {
    expect(paginate(items, 3, 99)).toEqual({
      slice: [7],
      pageCount: 3,
      page: 3,
    });
  });

  it("clamps a page below 1 up to 1", () => {
    expect(paginate(items, 3, 0).page).toBe(1);
    expect(paginate(items, 3, -5).slice).toEqual([1, 2, 3]);
  });

  it("gives an empty list one page", () => {
    expect(paginate([], 5, 1)).toEqual({ slice: [], pageCount: 1, page: 1 });
  });

  it("treats a non-positive perPage as 1", () => {
    expect(paginate(items, 0, 2)).toEqual({
      slice: [2],
      pageCount: 7,
      page: 2,
    });
  });

  it("does not mutate the input", () => {
    const input = [...items];
    paginate(input, 2, 1);
    expect(input).toEqual(items);
  });
});
