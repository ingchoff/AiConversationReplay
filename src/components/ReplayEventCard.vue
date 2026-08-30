<script setup lang="ts">
import { AlertTriangle, Clock3, Play } from "lucide-vue-next";
import { computed } from "vue";
import type { ReplayEvent } from "../types/conversation";
import { categoryStyles, getEventCategory } from "../utils/eventStyles";
import { getEventPlaybackRange } from "../utils/playback";
import { formatTime } from "../utils/time";

const props = defineProps<{
  event: ReplayEvent;
  selected: boolean;
  playing: boolean;
  audioDuration: number;
  fallbackDuration: number;
}>();

const emit = defineEmits<{
  select: [event: ReplayEvent];
  deselect: [event: ReplayEvent];
  replay: [event: ReplayEvent];
}>();
const category = computed(() => getEventCategory(props.event.eventType));
const style = computed(() => categoryStyles[category.value]);
const validationDuration = computed(() => props.audioDuration || props.fallbackDuration);
const range = computed(() => getEventPlaybackRange(props.event, validationDuration.value, 0, 0));
const duration = computed(() => Math.max(0, props.event.endSec - props.event.startSec));

function selectAndReplay() {
  if (props.selected) {
    emit("deselect", props.event);
    return;
  }
  emit("select", props.event);
  if (range.value.valid) emit("replay", props.event);
}
</script>

<template>
  <button
    type="button"
    class="event-card"
    :class="{ selected, playing, invalid: !range.valid }"
    :style="{ '--event-accent': style.accent }"
    :aria-pressed="selected"
    :aria-expanded="selected"
    :aria-disabled="!range.valid"
    :aria-label="`${range.valid ? 'Replay' : 'View'} ${event.title}, ${formatTime(event.startSec)} to ${formatTime(event.endSec)}`"
    @click="selectAndReplay"
  >
    <span class="event-rail" aria-hidden="true"></span>
    <span class="event-time-block">
      <span class="event-time">{{ formatTime(event.startSec) }}</span>
      <span class="event-duration"><Clock3 :size="12" /> {{ formatTime(duration) }}</span>
    </span>
    <span class="event-content">
      <span class="event-topline">
        <span class="event-type" :class="style.badge">{{ event.eventType.replace(/_/g, " ") }}</span>
        <span v-if="playing" class="now-playing"><span></span> Playing</span>
        <Play v-else :size="15" class="event-play-icon" aria-hidden="true" />
      </span>
      <strong>{{ event.title }}</strong>
      <span v-if="selected" class="event-details">
        <span class="event-summary">{{ event.summary }}</span>
        <span class="event-detail-grid">
          <span class="event-detail-item"><span>Start</span><time>{{ formatTime(event.startSec) }}</time></span>
          <span class="event-detail-item"><span>End</span><time>{{ formatTime(event.endSec) }}</time></span>
          <span class="event-detail-item"><span>Speaker</span><strong>{{ event.speaker }}</strong></span>
          <span class="event-detail-item"><span>Priority</span><strong>{{ event.importance }}</strong></span>
          <span class="event-detail-item"><span>Confidence</span><strong>{{ Math.round(event.confidence * 100) }}%</strong></span>
          <span class="event-detail-item"><span>Evidence</span><strong>{{ event.sourceSegmentIds.length }} segment{{ event.sourceSegmentIds.length === 1 ? "" : "s" }}</strong></span>
        </span>
      </span>
      <span v-if="!range.valid" class="invalid-message"><AlertTriangle :size="13" /> {{ range.reason }}</span>
    </span>
  </button>
</template>
