<script setup lang="ts">
import { Sparkles } from "lucide-vue-next";
import { computed } from "vue";
import type { ReplayEvent } from "../types/conversation";
import ReplayEventCard from "./ReplayEventCard.vue";

const props = defineProps<{
  events: ReplayEvent[];
  selectedEvent: ReplayEvent | null;
  playingEventId: string | null;
  audioDuration: number;
  fallbackDuration: number;
}>();

const emit = defineEmits<{
  select: [event: ReplayEvent];
  deselect: [event: ReplayEvent];
  replay: [event: ReplayEvent];
}>();
const sortedEvents = computed(() => [...props.events].sort((a, b) => a.startSec - b.startSec));
</script>

<template>
  <section class="panel timeline-panel" aria-labelledby="events-heading">
    <div class="panel-header">
      <div>
        <p class="eyebrow">AI-identified moments</p>
        <h2 id="events-heading">Replay events</h2>
      </div>
      <span class="count-pill"><Sparkles :size="13" /> {{ events.length }}</span>
    </div>
    <div v-if="sortedEvents.length" class="event-list">
      <ReplayEventCard
        v-for="event in sortedEvents"
        :key="event.eventId"
        :event="event"
        :selected="selectedEvent?.eventId === event.eventId"
        :playing="playingEventId === event.eventId"
        :audio-duration="audioDuration"
        :fallback-duration="fallbackDuration"
        @select="emit('select', $event)"
        @deselect="emit('deselect', $event)"
        @replay="emit('replay', $event)"
      />
    </div>
    <p v-else class="empty-state">No replay events were identified for this call.</p>
  </section>
</template>
