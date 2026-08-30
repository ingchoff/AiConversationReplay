<script setup lang="ts">
import { MessageSquareText } from "lucide-vue-next";
import { computed, nextTick, ref, watch } from "vue";
import type { ReplayEvent, TranscriptSegment } from "../types/conversation";
import { formatTime } from "../utils/time";

const props = defineProps<{
  transcript: TranscriptSegment[];
  selectedEvent: ReplayEvent | null;
  currentTime: number;
}>();

const emit = defineEmits<{ seek: [seconds: number] }>();
const segmentElements = ref(new Map<number, HTMLElement>());
const sortedTranscript = computed(() => [...props.transcript].sort((a, b) => a.startSec - b.startSec));
const evidenceIds = computed(() => new Set(props.selectedEvent?.sourceSegmentIds ?? []));
const activeSegmentId = computed(
  () =>
    props.transcript.find(
      (segment) => props.currentTime >= segment.startSec && props.currentTime <= segment.endSec,
    )?.segmentId ?? null,
);

function setSegmentElement(element: Element | null, segmentId: number) {
  if (element instanceof HTMLElement) segmentElements.value.set(segmentId, element);
  else segmentElements.value.delete(segmentId);
}

watch(
  () => props.selectedEvent?.eventId,
  async () => {
    const firstEvidenceId = props.selectedEvent?.sourceSegmentIds[0];
    if (firstEvidenceId === undefined) return;
    await nextTick();
    const firstEvidence = segmentElements.value.get(firstEvidenceId);
    if (typeof firstEvidence?.scrollIntoView === "function") {
      firstEvidence.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  },
);
</script>

<template>
  <section class="panel transcript-panel" aria-labelledby="transcript-heading">
    <div class="panel-header">
      <div>
        <p class="eyebrow">Transcript evidence</p>
        <h2 id="transcript-heading">Conversation</h2>
      </div>
      <span class="count-pill"><MessageSquareText :size="13" /> {{ transcript.length }}</span>
    </div>
    <div v-if="sortedTranscript.length" class="transcript-list">
      <button
        v-for="segment in sortedTranscript"
        :key="segment.segmentId"
        :ref="(element) => setSegmentElement(element as Element | null, segment.segmentId)"
        type="button"
        class="transcript-segment"
        :class="{
          agent: segment.speaker === 'AGENT',
          customer: segment.speaker === 'CUSTOMER',
          evidence: evidenceIds.has(segment.segmentId),
          active: activeSegmentId === segment.segmentId,
        }"
        :aria-label="`Seek to ${formatTime(segment.startSec)}, ${segment.speaker}`"
        @click="emit('seek', segment.startSec)"
      >
        <span class="speaker-marker" aria-hidden="true"></span>
        <span class="transcript-copy">
          <span class="transcript-meta">
            <time>{{ formatTime(segment.startSec) }}</time>
            <span>{{ segment.speaker }}</span>
            <span v-if="evidenceIds.has(segment.segmentId)" class="evidence-label">AI evidence</span>
            <span v-if="activeSegmentId === segment.segmentId" class="active-label">Now playing</span>
          </span>
          <span class="transcript-text" lang="th">{{ segment.text }}</span>
        </span>
      </button>
    </div>
    <p v-else class="empty-state">No transcript is available for this call.</p>
  </section>
</template>
