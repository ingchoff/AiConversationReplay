export type Speaker = "AGENT" | "CUSTOMER" | "BOTH" | "UNKNOWN";
export type TranscriptSpeaker = Exclude<Speaker, "BOTH">;
export type Importance = "high" | "medium" | "low";
export type CustomerSentiment =
  | "positive"
  | "neutral"
  | "negative"
  | "mixed"
  | "unknown";

export interface TranscriptSegment {
  segmentId: number;
  speaker: TranscriptSpeaker;
  startSec: number;
  endSec: number;
  text: string;
}

export interface ReplayEvent {
  eventId: string;
  eventType: string;
  startSec: number;
  endSec: number;
  title: string;
  summary: string;
  speaker: Speaker;
  importance: Importance;
  confidence: number;
  sourceSegmentIds: number[];
}

export interface CallSummary {
  reasonForCall: string | null;
  resolution: string | null;
  outcome: string | null;
  customerSentiment: CustomerSentiment;
  caseStatus: string;
}

export interface ConversationReplay {
  callId: string;
  durationSec: number;
  audioUrl: string;
  callSummary: CallSummary;
  replayEvents: ReplayEvent[];
  transcript: TranscriptSegment[];
}

export type ConversationReplayResult = Omit<ConversationReplay, "audioUrl">;

export type AnalysisState = "idle" | "processing" | "success" | "fail";

export interface TranscriptWordTiming {
  start: number;
  end: number;
  word: string;
}

export interface TranscriptionSourceSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  channel: string;
  words: TranscriptWordTiming[];
}

export interface TranscriptionSourceData {
  requestId: string;
  filename: string;
  tableId: string;
  transcription: string;
  segments: TranscriptionSourceSegment[];
  segmentsAndWords: TranscriptionSourceSegment[];
}

export interface TranscriptionSuccessResponse {
  success: true;
  data: ConversationReplayResult;
  source: TranscriptionSourceData;
  warnings: string[];
}

export interface TranscriptionErrorDetail {
  code: string;
  message: string;
}

export interface TranscriptionFailureResponse {
  status: "fail";
  error: TranscriptionErrorDetail;
}

export type PlaybackMode =
  | { type: "normal" }
  | {
      type: "event";
      eventId: string;
      playbackStart: number;
      playbackEnd: number;
    };

export interface AudioPlayerHandle {
  replayEvent: (event: ReplayEvent) => Promise<void>;
  replaySelectedEvent: () => Promise<void>;
  seekTo: (seconds: number) => void;
  togglePlayback: () => Promise<void>;
  pause: () => void;
}
