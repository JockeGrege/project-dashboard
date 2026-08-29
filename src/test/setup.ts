import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});

// jsdom ships no object-URL support; the attachments code only needs a unique
// string back and a no-op revoke.
if (typeof URL.createObjectURL !== "function") {
  let n = 0;
  URL.createObjectURL = () => `blob:mock/${++n}`;
  URL.revokeObjectURL = () => {};
}
