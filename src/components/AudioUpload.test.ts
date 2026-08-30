import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import AudioUpload from "./AudioUpload.vue";

describe("AudioUpload", () => {
  it("enables analysis when a file has been selected", async () => {
    const wrapper = mount(AudioUpload, {
      props: { fileName: "call.wav", state: "idle", errorMessage: null },
    });

    const analyze = wrapper.get(".analyze-button");
    expect(analyze.attributes("disabled")).toBeUndefined();
    await analyze.trigger("click");
    expect(wrapper.emitted("analyze")).toHaveLength(1);
  });

  it("shows one processing state and emits cancel", async () => {
    const wrapper = mount(AudioUpload, {
      props: { fileName: "call.wav", state: "processing", errorMessage: null },
    });

    expect(wrapper.text()).toContain("Analyzing conversation");
    expect(wrapper.find(".analyze-button").exists()).toBe(false);
    await wrapper.get(".cancel-button").trigger("click");
    expect(wrapper.emitted("cancel")).toHaveLength(1);
  });

  it("shows a retry action and the failure message", () => {
    const wrapper = mount(AudioUpload, {
      props: { fileName: "call.wav", state: "fail", errorMessage: "Analysis failed." },
    });

    expect(wrapper.text()).toContain("Retry analysis");
    expect(wrapper.get("[role='alert']").text()).toContain("Analysis failed.");
  });
});
