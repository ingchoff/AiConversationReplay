import { afterEach, describe, expect, it, vi } from "vitest";
import { parseTranscriptionResponse, transcribeAudio } from "./transcription";

const replayResult = {
  callId: "call_0001",
  callSummary: {
    reasonForCall: "Customer wants to purchase insurance.",
    resolution: "Agent completed the enrollment.",
    outcome: "Policy purchased and payment arranged.",
    customerSentiment: "positive",
    caseStatus: "resolved",
  },
  replayEvents: [
    {
      eventId: "e1",
      eventType: "CUSTOMER_CONFIRMATION",
      startSec: 10.4,
      endSec: 17.04,
      title: "Customer agrees to purchase",
      summary: "The customer verbally agrees to purchase the policy.",
      speaker: "BOTH",
      importance: "high",
      confidence: 0.98,
      sourceSegmentIds: [3, 4],
    },
  ],
};

function createPayload(content: string = JSON.stringify(replayResult)) {
  return {
    request_id: "6d134687835c497eb3c9a6fc83c8a03e",
    filename: "10308150_original.wav",
    table_id: "step1_api_20260830_160818_6d134687",
    status: "success",
    Transcription: "Agent offers insurance and the customer accepts.",
    Segments: JSON.stringify([
      { id: 3, start: 10.4, end: 13.2, text: "Would you like the policy?", channel: "Agent" },
      { id: 4, start: 13.3, end: 17.04, text: "I agree.", channel: "Caller" },
    ]),
    SegmentsAndWords: JSON.stringify([
      {
        id: 3,
        start: 10.4,
        end: 13.2,
        text: "Would you like the policy?",
        channel: "Agent",
        words: [{ start: 10.4, end: 10.8, word: "Would" }],
      },
      {
        id: 4,
        start: 13.3,
        end: 17.04,
        text: "I agree.",
        channel: "Caller",
        words: [{ start: 13.3, end: 14, word: "agree" }],
      },
    ]),
    jamai_response: {
      object: "gen_table.completion.rows",
      rows: [
        {
          columns: {
            SummarizeConversationReplay: {
              choices: [{ message: { role: "assistant", content } }],
            },
          },
          row_id: "row-001",
        },
      ],
    },
  };
}

afterEach(() => vi.restoreAllMocks());

describe("parseTranscriptionResponse", () => {
  it("extracts the JamAI result and maps SegmentsAndWords into UI transcript data", () => {
    const result = parseTranscriptionResponse(createPayload());

    expect(result.data.callId).toBe("call_0001");
    expect(result.data.replayEvents[0]?.sourceSegmentIds).toEqual([3, 4]);
    expect(result.data.transcript).toEqual([
      {
        segmentId: 3,
        speaker: "AGENT",
        startSec: 10.4,
        endSec: 13.2,
        text: "Would you like the policy?",
      },
      {
        segmentId: 4,
        speaker: "CUSTOMER",
        startSec: 13.3,
        endSec: 17.04,
        text: "I agree.",
      },
    ]);
    expect(result.source.segmentsAndWords[0]?.words[0]?.word).toBe("Would");
    expect(result.data.durationSec).toBe(17.04);
    expect(result.warnings).toEqual([]);
  });

  it("supports a fenced JamAI JSON result and falls back to request_id for callId", () => {
    const withoutCallId = { ...replayResult, callId: "" };
    const result = parseTranscriptionResponse(
      createPayload(`\`\`\`json\n${JSON.stringify(withoutCallId)}\n\`\`\``),
    );

    expect(result.data.callId).toBe("6d134687835c497eb3c9a6fc83c8a03e");
  });

  it("keeps the replay result usable when SegmentsAndWords cannot be parsed", () => {
    const payload = { ...createPayload(), SegmentsAndWords: "not-json" };
    const result = parseTranscriptionResponse(payload);

    expect(result.data.replayEvents).toHaveLength(1);
    expect(result.data.transcript).toEqual([]);
    expect(result.warnings).toContain("SegmentsAndWords could not be parsed as JSON.");
  });

  it("surfaces a structured backend failure", () => {
    expect(() =>
      parseTranscriptionResponse({
        status: "fail",
        error: { code: "JAMAI_REQUEST_FAILED", message: "JamAI was unavailable." },
      }),
    ).toThrowError("JamAI was unavailable.");
  });

  it("rejects a success response without JamAI completion content", () => {
    expect(() =>
      parseTranscriptionResponse({ ...createPayload(), jamai_response: { rows: [] } }),
    ).toThrowError(/SummarizeConversationReplay content is missing/i);
  });
});

describe("transcribeAudio", () => {
  it("posts only the selected file to the configured /transcribe endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(createPayload()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const file = new File(["audio"], "call.wav", { type: "audio/wav" });

    await transcribeAudio(file, { endpointUrl: "http://api.test/transcribe" });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://api.test/transcribe");
    expect(init.method).toBe("POST");
    const form = init.body as FormData;
    const uploadedFile = form.get("file") as File;
    expect(uploadedFile.name).toBe("call.wav");
    expect(uploadedFile.size).toBe(file.size);
    expect([...form.keys()]).toEqual(["file"]);
  });

  it("uses the backend error message for a failed HTTP request", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: "fail",
            error: { code: "TRANSCRIPTION_FAILED", message: "The recording is unreadable." },
          }),
          { status: 422, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(
      transcribeAudio(new File(["audio"], "call.wav"), {
        endpointUrl: "http://api.test/transcribe",
      }),
    ).rejects.toMatchObject({
      code: "TRANSCRIPTION_FAILED",
      message: "The recording is unreadable.",
      status: 422,
    });
  });
});
