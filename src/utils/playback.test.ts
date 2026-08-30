import { describe, expect, it } from "vitest";
import type { ReplayEvent } from "../types/conversation";
import { getEventPlaybackRange } from "./playback";

const event: ReplayEvent = {
  eventId: "EVT-TEST",
  eventType: "SOLUTION",
  startSec: 10,
  endSec: 20,
  title: "Test event",
  summary: "A test replay event",
  speaker: "AGENT",
  importance: "high",
  confidence: 0.9,
  sourceSegmentIds: [1],
};

describe("getEventPlaybackRange", () => {
  it("adds the default pre-roll and post-roll", () => {
    expect(getEventPlaybackRange(event, 30)).toEqual({
      start: 9,
      end: 20.5,
      valid: true,
      reason: null,
    });
  });

  it("clamps playback to the actual audio duration", () => {
    expect(getEventPlaybackRange({ ...event, startSec: 0.4, endSec: 29.9 }, 30)).toMatchObject({
      start: 0,
      end: 30,
      valid: true,
    });
  });

  it("rejects events outside the loaded audio", () => {
    const range = getEventPlaybackRange({ ...event, startSec: 31, endSec: 35 }, 30);
    expect(range.valid).toBe(false);
    expect(range.reason).toContain("outside");
  });

  it("rejects playback before audio metadata is ready", () => {
    expect(getEventPlaybackRange(event, 0).valid).toBe(false);
  });
});
