<script setup lang="ts">
import {
  AlertCircle,
  Gauge,
  LoaderCircle,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume2,
} from "lucide-vue-next";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";
import type {
  AudioPlayerHandle,
  PlaybackMode,
  ReplayEvent,
} from "../types/conversation";
import { categoryStyles, getEventCategory } from "../utils/eventStyles";
import { getEventPlaybackRange } from "../utils/playback";
import { formatTime } from "../utils/time";

const props = defineProps<{
  audioUrl: string;
  replayEvents: ReplayEvent[];
  selectedEvent: ReplayEvent | null;
}>();

const emit = defineEmits<{
  "time-update": [currentTime: number];
  "duration-ready": [duration: number];
  "playback-change": [playing: boolean, eventId: string | null];
  "event-complete": [];
  "request-replay": [event: ReplayEvent];
  error: [message: string];
}>();

const waveformElement = ref<HTMLElement | null>(null);
const waveSurfer = ref<WaveSurfer | null>(null);
const regions = RegionsPlugin.create();
const currentTime = ref(0);
const duration = ref(0);
const isPlaying = ref(false);
const isReady = ref(false);
const errorMessage = ref<string | null>(null);
const playbackRate = ref(1);
const playbackMode = ref<PlaybackMode>({ type: "normal" });
const speedOptions = [0.75, 1, 1.25, 1.5, 2];
let rangeFrame: number | null = null;

interface HoveredRegion {
  event: ReplayEvent;
  left: number;
}

const hoveredRegion = ref<HoveredRegion | null>(null);

const playingEventId = computed(() =>
  isPlaying.value && playbackMode.value.type === "event" ? playbackMode.value.eventId : null,
);

function cancelRangeMonitor() {
  if (rangeFrame !== null) cancelAnimationFrame(rangeFrame);
  rangeFrame = null;
}

function setNormalMode() {
  cancelRangeMonitor();
  playbackMode.value = { type: "normal" };
}

function startRangeMonitor() {
  cancelRangeMonitor();
  const monitor = () => {
    const player = waveSurfer.value;
    const mode = playbackMode.value;
    if (!player || mode.type !== "event" || !isPlaying.value) {
      rangeFrame = null;
      return;
    }

    if (player.getCurrentTime() >= mode.playbackEnd) {
      player.pause();
      playbackMode.value = { type: "normal" };
      rangeFrame = null;
      emit("event-complete");
      return;
    }
    rangeFrame = requestAnimationFrame(monitor);
  };
  rangeFrame = requestAnimationFrame(monitor);
}

function showRegionCard(event: ReplayEvent, pointerEvent: MouseEvent) {
  const waveform = waveformElement.value;
  if (!waveform) return;
  const bounds = waveform.getBoundingClientRect();
  const halfCardWidth = Math.min(150, Math.max(0, (bounds.width - 24) / 2));
  const left = Math.min(
    Math.max(pointerEvent.clientX - bounds.left, halfCardWidth + 12),
    bounds.width - halfCardWidth - 12,
  );
  hoveredRegion.value = { event, left };
}

function hideRegionCard() {
  hoveredRegion.value = null;
}

function addRegions() {
  regions.clearRegions();
  hideRegionCard();
  if (!duration.value) return;
  for (const event of props.replayEvents) {
    const range = getEventPlaybackRange(event, duration.value, 0, 0);
    if (!range.valid) continue;
    const category = getEventCategory(event.eventType);
    const content = document.createElement("span");
    content.textContent = event.title;
    const region = regions.addRegion({
      id: event.eventId,
      start: range.start,
      end: range.end,
      color: categoryStyles[category].region,
      drag: false,
      resize: false,
      content,
    });
    region.element?.setAttribute("aria-label", `${event.eventType}: ${event.title}`);
    if (region.element) region.element.style.cursor = "pointer";
    region.on("over", (pointerEvent) => showRegionCard(event, pointerEvent));
    region.on("leave", hideRegionCard);
  }
}

async function replayEvent(event: ReplayEvent) {
  const player = waveSurfer.value;
  if (!player || !isReady.value) {
    emit("error", "Audio is not ready yet");
    return;
  }
  const range = getEventPlaybackRange(event, duration.value);
  if (!range.valid) {
    emit("error", range.reason ?? "This replay event cannot be played");
    return;
  }

  cancelRangeMonitor();
  playbackMode.value = {
    type: "event",
    eventId: event.eventId,
    playbackStart: range.start,
    playbackEnd: range.end,
  };
  player.setTime(range.start);
  try {
    await player.play();
    startRangeMonitor();
  } catch {
    setNormalMode();
    emit("error", "Playback was blocked by the browser. Press play and try again.");
  }
}

async function replaySelectedEvent() {
  if (props.selectedEvent) await replayEvent(props.selectedEvent);
}

function seekTo(seconds: number) {
  const player = waveSurfer.value;
  if (!player || !isReady.value) return;
  setNormalMode();
  player.setTime(Math.min(Math.max(0, seconds), duration.value));
}

async function togglePlayback() {
  const player = waveSurfer.value;
  if (!player || !isReady.value) return;
  setNormalMode();
  try {
    await player.playPause();
  } catch {
    emit("error", "Playback could not be started.");
  }
}

function pause() {
  setNormalMode();
  waveSurfer.value?.pause();
}

function seekRelative(seconds: number) {
  seekTo(currentTime.value + seconds);
}

function changePlaybackRate() {
  waveSurfer.value?.setPlaybackRate(playbackRate.value, true);
}

onMounted(() => {
  if (!waveformElement.value) return;
  const player = WaveSurfer.create({
    container: waveformElement.value,
    url: props.audioUrl,
    height: 104,
    waveColor: "#cbd5e1",
    progressColor: "#2563eb",
    cursorColor: "#0f172a",
    cursorWidth: 2,
    barWidth: 2,
    barGap: 2,
    barRadius: 2,
    normalize: true,
    plugins: [regions],
  });
  waveSurfer.value = player;

  player.on("ready", (loadedDuration) => {
    isReady.value = true;
    duration.value = loadedDuration;
    errorMessage.value = null;
    emit("duration-ready", loadedDuration);
    addRegions();
  });
  player.on("timeupdate", (time) => {
    currentTime.value = time;
    emit("time-update", time);
  });
  player.on("play", () => {
    isPlaying.value = true;
    emit("playback-change", true, playingEventId.value);
  });
  player.on("pause", () => {
    isPlaying.value = false;
    emit("playback-change", false, null);
  });
  player.on("finish", () => {
    isPlaying.value = false;
    setNormalMode();
    emit("playback-change", false, null);
  });
  player.on("interaction", () => setNormalMode());
  player.on("error", (error) => {
    const message = `Unable to load call audio: ${error.message}`;
    errorMessage.value = message;
    emit("error", message);
  });
  regions.on("region-clicked", (region, mouseEvent) => {
    mouseEvent.stopPropagation();
    const event = props.replayEvents.find((item) => item.eventId === region.id);
    if (event) emit("request-replay", event);
  });
});

watch(
  () => props.audioUrl,
  (audioUrl, previousUrl) => {
    const player = waveSurfer.value;
    if (!player || audioUrl === previousUrl) return;
    setNormalMode();
    isReady.value = false;
    isPlaying.value = false;
    currentTime.value = 0;
    duration.value = 0;
    errorMessage.value = null;
    hideRegionCard();
    regions.clearRegions();
    void player.load(audioUrl);
  },
);

watch(
  () => props.replayEvents,
  () => {
    if (isReady.value) addRegions();
  },
  { deep: true },
);

onBeforeUnmount(() => {
  cancelRangeMonitor();
  waveSurfer.value?.destroy();
  waveSurfer.value = null;
});

defineExpose<AudioPlayerHandle>({ replayEvent, replaySelectedEvent, seekTo, togglePlayback, pause });
</script>

<template>
  <section class="surface player-card" aria-labelledby="player-heading">
    <div class="section-heading-row player-heading-row">
      <div>
        <p class="eyebrow">Call recording</p>
        <h2 id="player-heading">Audio replay</h2>
      </div>
      <div class="audio-state" :class="{ ready: isReady, error: errorMessage }">
        <LoaderCircle v-if="!isReady && !errorMessage" :size="14" class="spin" />
        <AlertCircle v-else-if="errorMessage" :size="14" />
        <Volume2 v-else :size="14" />
        {{ errorMessage ? "Audio unavailable" : isReady ? "Audio loaded" : "Loading audio" }}
      </div>
    </div>

    <div class="wave-shell" :class="{ loading: !isReady }">
      <div ref="waveformElement" class="waveform" aria-label="Interactive call waveform"></div>
      <div
        v-if="hoveredRegion"
        class="region-hover-card"
        role="tooltip"
        :style="{ left: `${hoveredRegion.left}px` }"
      >
        <span class="region-hover-type">{{ hoveredRegion.event.eventType.replace(/_/g, " ") }}</span>
        <strong>{{ hoveredRegion.event.title }}</strong>
        <span class="region-hover-time">{{ formatTime(hoveredRegion.event.startSec) }} – {{ formatTime(hoveredRegion.event.endSec) }}</span>
        <p>{{ hoveredRegion.event.summary }}</p>
      </div>
      <div v-if="!isReady && !errorMessage" class="wave-skeleton" aria-hidden="true"></div>
    </div>

    <div v-if="errorMessage" class="audio-error" role="alert">
      <AlertCircle :size="17" />
      <span><strong>Audio could not be loaded.</strong> Select the file again or try another supported audio format.</span>
    </div>

    <div class="time-row">
      <span>{{ formatTime(currentTime) }}</span>
      <div class="progress-track" aria-hidden="true"><span :style="{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }"></span></div>
      <span>{{ formatTime(duration) }}</span>
    </div>

    <div class="player-controls">
      <div class="control-group primary-controls">
        <button type="button" class="icon-button" :disabled="!isReady" aria-label="Seek backward 5 seconds" @click="seekRelative(-5)">
          <SkipBack :size="18" />
        </button>
        <button type="button" class="play-button" :disabled="!isReady" :aria-label="isPlaying ? 'Pause audio' : 'Play audio'" @click="togglePlayback">
          <Pause v-if="isPlaying" :size="20" fill="currentColor" />
          <Play v-else :size="20" fill="currentColor" />
          {{ isPlaying ? "Pause" : "Play" }}
        </button>
        <button type="button" class="icon-button" :disabled="!isReady" aria-label="Seek forward 5 seconds" @click="seekRelative(5)">
          <SkipForward :size="18" />
        </button>
      </div>

      <button
        v-if="selectedEvent"
        type="button"
        class="replay-button"
        :disabled="!isReady"
        @click="replaySelectedEvent"
      >
        <RotateCcw :size="16" /> Replay selected
        <span>{{ formatTime(selectedEvent.startSec) }}–{{ formatTime(selectedEvent.endSec) }}</span>
      </button>

      <label class="speed-control">
        <Gauge :size="16" />
        <span class="sr-only">Playback speed</span>
        <select v-model="playbackRate" :disabled="!isReady" aria-label="Playback speed" @change="changePlaybackRate">
          <option v-for="speed in speedOptions" :key="speed" :value="speed">{{ speed }}×</option>
        </select>
      </label>
    </div>
  </section>
</template>
