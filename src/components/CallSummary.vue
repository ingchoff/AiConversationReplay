<script setup lang="ts">
import { FileText, HeartPulse, Route, Wrench } from "lucide-vue-next";
import type { CallSummary } from "../types/conversation";
import StatusBadge from "./StatusBadge.vue";

const props = defineProps<{ summary: CallSummary | null }>();

function readableStatus(value: string): string {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function sentimentTone(sentiment: CallSummary["customerSentiment"]) {
  if (sentiment === "positive") return "emerald";
  if (sentiment === "negative") return "rose";
  if (sentiment === "mixed") return "amber";
  return "slate";
}
</script>

<template>
  <section class="surface summary-card" aria-labelledby="summary-heading">
    <div class="section-heading-row">
      <div>
        <p class="eyebrow">LLM-generated overview</p>
        <h2 id="summary-heading">Call summary</h2>
      </div>
      <div v-if="props.summary" class="summary-badges">
        <StatusBadge
          :label="readableStatus(props.summary.customerSentiment)"
          :tone="sentimentTone(props.summary.customerSentiment)"
        />
        <StatusBadge :label="readableStatus(props.summary.caseStatus)" tone="blue" />
      </div>
    </div>

    <div v-if="props.summary" class="summary-grid">
      <article class="summary-item summary-reason">
        <span class="summary-icon"><FileText :size="17" /></span>
        <div><h3>Reason for call</h3><p>{{ props.summary.reasonForCall ?? "Not available" }}</p></div>
      </article>
      <article class="summary-item">
        <span class="summary-icon"><Wrench :size="17" /></span>
        <div><h3>Resolution</h3><p>{{ props.summary.resolution ?? "Not available" }}</p></div>
      </article>
      <article class="summary-item">
        <span class="summary-icon"><Route :size="17" /></span>
        <div><h3>Outcome</h3><p>{{ props.summary.outcome ?? "Not available" }}</p></div>
      </article>
      <article class="summary-item summary-state">
        <span class="summary-icon"><HeartPulse :size="17" /></span>
        <div>
          <h3>Customer state</h3>
          <p>{{ readableStatus(props.summary.customerSentiment) }} sentiment · {{ readableStatus(props.summary.caseStatus) }}</p>
        </div>
      </article>
    </div>
    <p v-else class="empty-state">No call summary is available.</p>
  </section>
</template>
