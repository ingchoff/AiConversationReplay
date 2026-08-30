import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App.vue";

const mocks = vi.hoisted(() => ({ transcribeAudio: vi.fn() }));

vi.mock("./services/transcription", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./services/transcription")>();
  return { ...actual, transcribeAudio: mocks.transcribeAudio };
});

afterEach(() => {
  vi.restoreAllMocks();
  mocks.transcribeAudio.mockReset();
});

describe("App upload flow", () => {
  it("renders summary, replay events, and transcript from a successful analysis", async () => {
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:call-audio"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
    mocks.transcribeAudio.mockResolvedValue({
      success: true,
      data: {
        callId: "call_0001",
        durationSec: 17.04,
        callSummary: {
          reasonForCall: "Customer wants to purchase insurance.",
          resolution: "Agent completed enrollment.",
          outcome: "Policy purchased.",
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
            summary: "The customer verbally agrees.",
            speaker: "BOTH",
            importance: "high",
            confidence: 0.98,
            sourceSegmentIds: [4],
          },
        ],
        transcript: [
          {
            segmentId: 4,
            speaker: "CUSTOMER",
            startSec: 13.3,
            endSec: 17.04,
            text: "I agree.",
          },
        ],
      },
      source: {
        requestId: "request-1",
        filename: "call.wav",
        tableId: "table-1",
        transcription: "I agree.",
        segments: [],
        segmentsAndWords: [],
      },
      warnings: [],
    });

    const wrapper = mount(App, {
      global: { stubs: { AudioPlayer: true } },
    });
    const file = new File(["audio"], "call.wav", { type: "audio/wav" });
    const input = wrapper.get<HTMLInputElement>('input[type="file"]');
    Object.defineProperty(input.element, "files", { configurable: true, value: [file] });
    await input.trigger("change");
    await wrapper.get(".analyze-button").trigger("click");
    await flushPromises();

    expect(mocks.transcribeAudio).toHaveBeenCalledWith(file, { signal: expect.any(AbortSignal) });
    expect(wrapper.text()).toContain("call_0001");
    expect(wrapper.text()).toContain("Customer wants to purchase insurance.");
    expect(wrapper.text()).toContain("Customer agrees to purchase");
    expect(wrapper.text()).toContain("I agree.");

    await wrapper.get(".event-card").trigger("click");
    expect(wrapper.get(".event-card").classes()).toContain("selected");
    expect(wrapper.get(".event-details").text()).toContain("The customer verbally agrees.");
    expect(wrapper.get(".event-details").text()).toContain("1 segment");

    await wrapper.get(".event-card").trigger("click");
    expect(wrapper.get(".event-card").classes()).not.toContain("selected");
    expect(wrapper.find(".event-details").exists()).toBe(false);
  });
});
