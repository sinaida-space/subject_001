import { describe, it, expect } from "vitest";
import { nbsp } from "./typo";

const NBSP = " ";

describe("nbsp", () => {
  it("binds a single short word to the following word", () => {
    expect(nbsp("a big elephant")).toBe(`a${NBSP}big${NBSP}elephant`);
  });

  it("leaves words longer than 3 letters untouched", () => {
    expect(nbsp("visual worlds for physical spaces")).toBe(
      `visual worlds for${NBSP}physical spaces`
    );
  });

  it("fully binds a run of consecutive short words", () => {
    expect(nbsp("as of the year")).toBe(`as${NBSP}of${NBSP}the${NBSP}year`);
  });

  it("does not touch a short word at the very end of the string", () => {
    expect(nbsp("building for it")).toBe(`building for${NBSP}it`);
  });

  it("is a no-op on a string with no short words", () => {
    expect(nbsp("building interactive digital frameworks")).toBe(
      "building interactive digital frameworks"
    );
  });

  it("handles empty strings", () => {
    expect(nbsp("")).toBe("");
  });

  it("is idempotent", () => {
    const once = nbsp("as of the year for it");
    expect(nbsp(once)).toBe(once);
  });
});
