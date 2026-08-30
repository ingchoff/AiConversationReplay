import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import type { ReplayEvent } from "../types/conversation";
import ReplayEventCard from "./ReplayEventCard.vue";

const event: ReplayEvent = {
  eventId: "EVT-001",
  eventType: "CUSTOMER_PROBLEM",
  startSec: 31.4,
  endSec: 56.8,
  title: "Customer explains the issue",
  summary: "Customer reports that the air conditioner is not cooling.",
  speaker: "CUSTOMER",
  importance: "high",
  confidence: 0.97,
  sourceSegmentIds: [3, 4],
};

describe("ReplayEventCard", () => {
  it("selects and replays a valid event on click", async () => {
    const wrapper = mount(ReplayEventCard, {
      props: { event, selected: false, playing: false, audioDuration: 309, fallbackDuration: 309 },
    });

    expect(wrapper.text()).toContain("Customer explains the issue");
    expect(wrapper.find(".event-details").exists()).toBe(false);
    await wrapper.trigger("click");
    expect(wrapper.emitted("select")?.[0]).toEqual([event]);
    expect(wrapper.emitted("replay")?.[0]).toEqual([event]);
  });

  it("deselects an expanded event without replaying it again", async () => {
    const wrapper = mount(ReplayEventCard, {
      props: { event, selected: true, playing: false, audioDuration: 309, fallbackDuration: 309 },
    });

    expect(wrapper.attributes("aria-expanded")).toBe("true");
    await wrapper.trigger("click");
    expect(wrapper.emitted("deselect")?.[0]).toEqual([event]);
    expect(wrapper.emitted("replay")).toBeUndefined();
  });

  it("allows an invalid event to be selected without requesting replay", async () => {
    const invalidEvent = { ...event, startSec: 400, endSec: 420 };
    const wrapper = mount(ReplayEventCard, {
      props: { event: invalidEvent, selected: false, playing: false, audioDuration: 309, fallbackDuration: 309 },
    });

    expect(wrapper.attributes("disabled")).toBeUndefined();
    expect(wrapper.attributes("aria-disabled")).toBe("true");
    expect(wrapper.text()).toContain("outside the audio duration");
    await wrapper.trigger("click");
    expect(wrapper.emitted("select")?.[0]).toEqual([invalidEvent]);
    expect(wrapper.emitted("replay")).toBeUndefined();
  });

  it("reveals the event details only after the card is selected", async () => {
    const wrapper = mount(ReplayEventCard, {
      props: { event, selected: false, playing: false, audioDuration: 309, fallbackDuration: 309 },
    });

    expect(wrapper.find(".event-details").exists()).toBe(false);
    await wrapper.setProps({ selected: true });
    expect(wrapper.find(".event-details").text()).toContain(event.summary);
    expect(wrapper.find(".event-details").text()).toContain("97%");
    expect(wrapper.find(".event-details").text()).toContain("2 segments");
  });
});
