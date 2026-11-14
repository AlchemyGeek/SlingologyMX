import { describe, it, expect } from "vitest";
import { parseCompression, formatCompression, isLowCompression } from "./compression";

describe("compression", () => {
  it("accepts 0-80 whole numbers", () => {
    expect(parseCompression("00")).toBe(0);
    expect(parseCompression("80")).toBe(80);
    expect(parseCompression("72")).toBe(72);
  });
  it("rejects above 80, decimals and text", () => {
    expect(parseCompression("81")).toBeNull();
    expect(parseCompression("7.5")).toBeNull();
    expect(parseCompression("ab")).toBeNull();
  });
  it("formats as XX/80", () => {
    expect(formatCompression(5)).toBe("05/80");
    expect(formatCompression(74)).toBe("74/80");
  });
  it("flags readings below threshold only", () => {
    expect(isLowCompression(59, 60)).toBe(true);
    expect(isLowCompression(60, 60)).toBe(false);
  });
});
