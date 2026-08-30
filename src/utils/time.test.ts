import { describe, expect, it } from "vitest";
import { formatTime } from "./time";

describe("formatTime", () => {
  it("formats call timestamps as MM:SS", () => {
    expect(formatTime(188.6)).toBe("03:08");
    expect(formatTime(0)).toBe("00:00");
  });

  it("supports calls longer than one hour", () => {
    expect(formatTime(3661.9)).toBe("01:01:01");
  });

  it("safely handles invalid and negative values", () => {
    expect(formatTime(Number.NaN)).toBe("00:00");
    expect(formatTime(-15)).toBe("00:00");
  });
});
