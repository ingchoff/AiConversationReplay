import type { ReplayEvent } from "../types/conversation";

export const PRE_ROLL_SEC = 1;
export const POST_ROLL_SEC = 0.5;

export interface EventPlaybackRange {
  start: number;
  end: number;
  valid: boolean;
  reason: string | null;
}

export function getEventPlaybackRange(
  event: ReplayEvent,
  audioDuration: number,
  preRoll = PRE_ROLL_SEC,
  postRoll = POST_ROLL_SEC,
): EventPlaybackRange {
  const duration = Number.isFinite(audioDuration) ? Math.max(0, audioDuration) : 0;
  const startSec = Number.isFinite(event.startSec) ? Math.max(0, event.startSec) : 0;
  const endSec = Number.isFinite(event.endSec) ? Math.min(duration, event.endSec) : 0;

  if (duration <= 0) {
    return { start: 0, end: 0, valid: false, reason: "Audio is not ready" };
  }

  if (endSec <= startSec) {
    return {
      start: startSec,
      end: endSec,
      valid: false,
      reason: "Event timestamps are outside the audio duration",
    };
  }

  return {
    start: Math.max(0, startSec - preRoll),
    end: Math.min(duration, endSec + postRoll),
    valid: true,
    reason: null,
  };
}
