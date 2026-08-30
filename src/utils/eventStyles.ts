export type EventCategory =
  | "general"
  | "problem"
  | "verification"
  | "action"
  | "success"
  | "warning"
  | "critical";

const categoryByEventType: Record<string, EventCategory> = {
  GREETING: "general",
  RECORDING_CONSENT: "verification",
  INSURANCE_OFFER: "action",
  COVERAGE_EXPLANATION: "action",
  EXCLUSION_EXPLANATION: "warning",
  PURCHASE_CONFIRMATION: "success",
  CUSTOMER_REQUEST: "problem",
  CUSTOMER_QUESTION: "problem",
  CUSTOMER_DISSATISFACTION: "warning",
  CUSTOMER_SATISFACTION: "success",
  IDENTITY_VERIFICATION: "verification",
  PAYMENT_METHOD: "verification",
  PAYMENT_VERIFICATION: "verification",
  CUSTOMER_INFORMATION: "verification",
  DELIVERY_INFORMATION: "action",
  POLICY_SUMMARY: "success",
  ESCALATION: "warning",
  TRANSFER: "warning",
  HOLD: "general",
  COMPLIANCE_RISK: "critical",
  AGENT_ERROR: "critical",
  CLOSING: "general",
  OTHER_IMPORTANT: "general",
};

export const categoryStyles: Record<
  EventCategory,
  { accent: string; badge: string; region: string }
> = {
  general: { accent: "#64748b", badge: "badge-slate", region: "rgba(100, 116, 139, 0.18)" },
  problem: { accent: "#e11d48", badge: "badge-rose", region: "rgba(225, 29, 72, 0.16)" },
  verification: { accent: "#7c3aed", badge: "badge-violet", region: "rgba(124, 58, 237, 0.16)" },
  action: { accent: "#2563eb", badge: "badge-blue", region: "rgba(37, 99, 235, 0.16)" },
  success: { accent: "#059669", badge: "badge-emerald", region: "rgba(5, 150, 105, 0.16)" },
  warning: { accent: "#d97706", badge: "badge-amber", region: "rgba(217, 119, 6, 0.17)" },
  critical: { accent: "#dc2626", badge: "badge-red", region: "rgba(220, 38, 38, 0.18)" },
};

export function getEventCategory(eventType: string): EventCategory {
  return categoryByEventType[eventType] ?? "general";
}
