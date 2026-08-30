import { describe, expect, it } from "vitest";
import { getEventCategory } from "./eventStyles";

describe("getEventCategory", () => {
  it.each([
    ["GREETING", "general"],
    ["RECORDING_CONSENT", "verification"],
    ["INSURANCE_OFFER", "action"],
    ["COVERAGE_EXPLANATION", "action"],
    ["EXCLUSION_EXPLANATION", "warning"],
    ["PURCHASE_CONFIRMATION", "success"],
    ["CUSTOMER_REQUEST", "problem"],
    ["CUSTOMER_QUESTION", "problem"],
    ["CUSTOMER_DISSATISFACTION", "warning"],
    ["CUSTOMER_SATISFACTION", "success"],
    ["IDENTITY_VERIFICATION", "verification"],
    ["PAYMENT_METHOD", "verification"],
    ["PAYMENT_VERIFICATION", "verification"],
    ["CUSTOMER_INFORMATION", "verification"],
    ["DELIVERY_INFORMATION", "action"],
    ["POLICY_SUMMARY", "success"],
    ["ESCALATION", "warning"],
    ["TRANSFER", "warning"],
    ["HOLD", "general"],
    ["COMPLIANCE_RISK", "critical"],
    ["AGENT_ERROR", "critical"],
    ["CLOSING", "general"],
    ["OTHER_IMPORTANT", "general"],
  ] as const)("maps %s to %s", (eventType, category) => {
    expect(getEventCategory(eventType)).toBe(category);
  });

  it("uses the general category for an unknown future event type", () => {
    expect(getEventCategory("FUTURE_EVENT")).toBe("general");
  });
});
