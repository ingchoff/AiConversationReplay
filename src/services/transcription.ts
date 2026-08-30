import type {
  CallSummary,
  ConversationReplayResult,
  CustomerSentiment,
  Importance,
  ReplayEvent,
  Speaker,
  TranscriptSegment,
  TranscriptSpeaker,
  TranscriptWordTiming,
  TranscriptionErrorDetail,
  TranscriptionSourceSegment,
  TranscriptionSuccessResponse,
} from "../types/conversation";

const DEFAULT_TRANSCRIPTION_URL = "http://172.18.72.145:4000/transcribe";
const SENTIMENTS = new Set<CustomerSentiment>([
  "positive",
  "neutral",
  "negative",
  "mixed",
  "unknown",
]);
const SPEAKERS = new Set<Speaker>(["AGENT", "CUSTOMER", "BOTH", "UNKNOWN"]);
const IMPORTANCE_LEVELS = new Set<Importance>(["high", "medium", "low"]);

export class TranscriptionRequestError extends Error {
  readonly code: string;
  readonly status: number | null;

  constructor(detail: TranscriptionErrorDetail, status: number | null = null) {
    super(detail.message);
    this.name = "TranscriptionRequestError";
    this.code = detail.code;
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

function invalidResponse(reason: string): TranscriptionRequestError {
  return new TranscriptionRequestError({
    code: "INVALID_BACKEND_RESPONSE",
    message: `The analysis service returned invalid data: ${reason}.`,
  });
}

function stripCodeFence(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match?.[1]?.trim() ?? trimmed;
}

function parseJsonString(value: string, label: string): unknown {
  try {
    return JSON.parse(stripCodeFence(value)) as unknown;
  } catch {
    throw invalidResponse(`${label} is not valid JSON`);
  }
}

function parseCallSummary(value: unknown): CallSummary {
  if (!isRecord(value)) throw invalidResponse("callSummary must be an object");
  const sentiment = value.customerSentiment;
  if (
    !isNullableString(value.reasonForCall) ||
    !isNullableString(value.resolution) ||
    !isNullableString(value.outcome) ||
    typeof sentiment !== "string" ||
    !SENTIMENTS.has(sentiment as CustomerSentiment) ||
    typeof value.caseStatus !== "string"
  ) {
    throw invalidResponse("callSummary contains invalid fields");
  }

  return {
    reasonForCall: value.reasonForCall,
    resolution: value.resolution,
    outcome: value.outcome,
    customerSentiment: sentiment as CustomerSentiment,
    caseStatus: value.caseStatus,
  };
}

function parseReplayEvent(value: unknown, index: number): ReplayEvent {
  if (!isRecord(value)) throw invalidResponse(`replayEvents[${index}] must be an object`);
  const speaker = value.speaker;
  const importance = value.importance;
  const sourceSegmentIds = value.sourceSegmentIds;
  if (
    typeof value.eventId !== "string" ||
    typeof value.eventType !== "string" ||
    !isFiniteNumber(value.startSec) ||
    !isFiniteNumber(value.endSec) ||
    typeof value.title !== "string" ||
    typeof value.summary !== "string" ||
    typeof speaker !== "string" ||
    !SPEAKERS.has(speaker as Speaker) ||
    typeof importance !== "string" ||
    !IMPORTANCE_LEVELS.has(importance as Importance) ||
    !isFiniteNumber(value.confidence) ||
    value.confidence < 0 ||
    value.confidence > 1 ||
    !Array.isArray(sourceSegmentIds) ||
    !sourceSegmentIds.every(Number.isInteger)
  ) {
    throw invalidResponse(`replayEvents[${index}] contains invalid fields`);
  }

  return {
    eventId: value.eventId,
    eventType: value.eventType,
    startSec: value.startSec,
    endSec: value.endSec,
    title: value.title,
    summary: value.summary,
    speaker: speaker as Speaker,
    importance: importance as Importance,
    confidence: value.confidence,
    sourceSegmentIds: sourceSegmentIds as number[],
  };
}

function parseWord(value: unknown): TranscriptWordTiming | null {
  if (
    !isRecord(value) ||
    !isFiniteNumber(value.start) ||
    !isFiniteNumber(value.end) ||
    typeof value.word !== "string"
  ) {
    return null;
  }
  return { start: value.start, end: value.end, word: value.word };
}

function parseSourceSegments(
  value: unknown,
  label: "Segments" | "SegmentsAndWords",
  warnings: string[],
): TranscriptionSourceSegment[] {
  if (typeof value !== "string" || !value.trim()) {
    warnings.push(`${label} was not included in the transcription response.`);
    return [];
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(value) as unknown;
  } catch {
    warnings.push(`${label} could not be parsed as JSON.`);
    return [];
  }
  if (!Array.isArray(decoded)) {
    warnings.push(`${label} must contain a JSON array.`);
    return [];
  }

  const segments: TranscriptionSourceSegment[] = [];
  let skipped = 0;
  for (const item of decoded) {
    if (
      !isRecord(item) ||
      !Number.isInteger(item.id) ||
      !isFiniteNumber(item.start) ||
      !isFiniteNumber(item.end) ||
      item.end <= item.start ||
      typeof item.text !== "string" ||
      typeof item.channel !== "string"
    ) {
      skipped += 1;
      continue;
    }

    const words = Array.isArray(item.words)
      ? item.words.map(parseWord).filter((word): word is TranscriptWordTiming => word !== null)
      : [];
    segments.push({
      id: item.id as number,
      start: item.start,
      end: item.end,
      text: item.text,
      channel: item.channel,
      words,
    });
  }
  if (skipped > 0) warnings.push(`${label} contained ${skipped} invalid segment${skipped === 1 ? "" : "s"}.`);
  return segments;
}

function mapSpeaker(channel: string): TranscriptSpeaker {
  const normalized = channel.trim().toLowerCase();
  if (normalized === "agent") return "AGENT";
  if (normalized === "caller" || normalized === "customer") return "CUSTOMER";
  return "UNKNOWN";
}

function toTranscript(segments: TranscriptionSourceSegment[]): TranscriptSegment[] {
  return segments.map((segment) => ({
    segmentId: segment.id,
    speaker: mapSpeaker(segment.channel),
    startSec: segment.start,
    endSec: segment.end,
    text: segment.text,
  }));
}

function extractJamaiContent(payload: Record<string, unknown>): string {
  const jamaiResponse = payload.jamai_response;
  if (!isRecord(jamaiResponse) || !Array.isArray(jamaiResponse.rows)) {
    throw invalidResponse("jamai_response.rows is missing");
  }

  for (const row of jamaiResponse.rows) {
    if (!isRecord(row) || !isRecord(row.columns)) continue;
    const completion = row.columns.SummarizeConversationReplay;
    if (!isRecord(completion) || !Array.isArray(completion.choices)) continue;
    for (const choice of completion.choices) {
      if (!isRecord(choice) || !isRecord(choice.message)) continue;
      const content = choice.message.content;
      if (typeof content === "string" && content.trim()) return content;
    }
  }

  throw invalidResponse("SummarizeConversationReplay content is missing");
}

function extractError(payload: unknown, fallbackCode: string): TranscriptionErrorDetail {
  if (!isRecord(payload)) {
    return { code: fallbackCode, message: "The audio analysis could not be completed." };
  }
  const error = payload.error;
  if (isRecord(error)) {
    return {
      code: typeof error.code === "string" ? error.code : fallbackCode,
      message:
        typeof error.message === "string"
          ? error.message
          : "The audio analysis could not be completed.",
    };
  }
  const message =
    typeof error === "string"
      ? error
      : typeof payload.message === "string"
        ? payload.message
        : typeof payload.detail === "string"
          ? payload.detail
          : "The audio analysis could not be completed.";
  return { code: fallbackCode, message };
}

export function parseTranscriptionResponse(payload: unknown): TranscriptionSuccessResponse {
  if (!isRecord(payload)) throw invalidResponse("response must be an object");
  if (payload.status !== "success") {
    throw new TranscriptionRequestError(extractError(payload, "ANALYSIS_FAILED"));
  }

  const warnings: string[] = [];
  const content = parseJsonString(extractJamaiContent(payload), "SummarizeConversationReplay content");
  if (!isRecord(content)) throw invalidResponse("SummarizeConversationReplay content must be an object");
  if (!Array.isArray(content.replayEvents)) throw invalidResponse("replayEvents must be an array");

  const requestId = typeof payload.request_id === "string" ? payload.request_id : "";
  const callId = typeof content.callId === "string" && content.callId.trim() ? content.callId : requestId;
  if (!callId) throw invalidResponse("callId and request_id are missing");

  const segments = parseSourceSegments(payload.Segments, "Segments", warnings);
  const segmentsAndWords = parseSourceSegments(payload.SegmentsAndWords, "SegmentsAndWords", warnings);
  const transcript = toTranscript(segmentsAndWords);
  const replayEvents = content.replayEvents.map(parseReplayEvent).sort((a, b) => a.startSec - b.startSec);
  const durationSec = Math.max(
    0,
    ...replayEvents.map((event) => event.endSec),
    ...transcript.map((segment) => segment.endSec),
  );

  const result: ConversationReplayResult = {
    callId,
    durationSec,
    callSummary: parseCallSummary(content.callSummary),
    replayEvents,
    transcript,
  };

  return {
    success: true,
    data: result,
    source: {
      requestId,
      filename: typeof payload.filename === "string" ? payload.filename : "",
      tableId: typeof payload.table_id === "string" ? payload.table_id : "",
      transcription: typeof payload.Transcription === "string" ? payload.Transcription : "",
      segments,
      segmentsAndWords,
    },
    warnings,
  };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new TranscriptionRequestError(
      {
        code: "INVALID_BACKEND_RESPONSE",
        message: "The analysis service returned a non-JSON response.",
      },
      response.status,
    );
  }
}

export async function transcribeAudio(
  file: File,
  options: { signal?: AbortSignal; endpointUrl?: string } = {},
): Promise<TranscriptionSuccessResponse> {
  const form = new FormData();
  form.append("file", file, file.name);

  const url = options.endpointUrl ?? import.meta.env.VITE_TRANSCRIPTION_URL ?? DEFAULT_TRANSCRIPTION_URL;
  let response: Response;
  try {
    response = await fetch(url, { method: "POST", body: form, signal: options.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new TranscriptionRequestError({
      code: "NETWORK_ERROR",
      message: "Unable to connect to the audio analysis service.",
    });
  }

  const payload = await readJson(response);
  if (!response.ok) {
    throw new TranscriptionRequestError(extractError(payload, `HTTP_${response.status}`), response.status);
  }

  return parseTranscriptionResponse(payload);
}
