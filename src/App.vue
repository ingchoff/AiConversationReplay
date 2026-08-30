<script setup lang="ts">
import { AlertTriangle, AudioLines } from "lucide-vue-next";
import { nextTick, onBeforeUnmount, ref } from "vue";
import AudioPlayer from "./components/AudioPlayer.vue";
import AudioUpload from "./components/AudioUpload.vue";
import CallSummary from "./components/CallSummary.vue";
import Header from "./components/Header.vue";
import ReplayTimeline from "./components/ReplayTimeline.vue";
import TranscriptPanel from "./components/TranscriptPanel.vue";
import { transcribeAudio, TranscriptionRequestError } from "./services/transcription";
import type {
  AnalysisState,
  AudioPlayerHandle,
  ConversationReplay,
  ReplayEvent,
} from "./types/conversation";

const selectedFile = ref<File | null>(null);
const analysisState = ref<AnalysisState>("idle");
const analysisError = ref<string | null>(null);
const warnings = ref<string[]>([]);
const conversation = ref<ConversationReplay | null>(null);
const selectedEvent = ref<ReplayEvent | null>(null);
const currentTime = ref(0);
const audioDuration = ref(0);
const isPlaying = ref(false);
const playingEventId = ref<string | null>(null);
const player = ref<AudioPlayerHandle | null>(null);
const playerSession = ref(0);
const notice = ref<string | null>(null);
let activeController: AbortController | null = null;
let audioObjectUrl: string | null = null;
let noticeTimer: number | null = null;

function revokeAudioUrl() {
  if (!audioObjectUrl) return;
  URL.revokeObjectURL(audioObjectUrl);
  audioObjectUrl = null;
}

function resetReplay() {
  player.value?.pause();
  selectedEvent.value = null;
  currentTime.value = 0;
  audioDuration.value = 0;
  isPlaying.value = false;
  playingEventId.value = null;
  conversation.value = null;
  warnings.value = [];
  revokeAudioUrl();
}

function isSupportedAudio(file: File): boolean {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const supportedExtensions = new Set(["wav", "mp3", "m4a", "aac", "flac", "ogg"]);
  return file.type.startsWith("audio/") || supportedExtensions.has(extension);
}

function selectFile(file: File | null) {
  activeController?.abort();
  activeController = null;
  resetReplay();
  analysisError.value = null;
  selectedFile.value = file;

  if (!file) {
    analysisState.value = "idle";
    return;
  }
  if (file.size <= 0 || !isSupportedAudio(file)) {
    selectedFile.value = null;
    analysisState.value = "fail";
    analysisError.value = "Select a non-empty WAV, MP3, M4A, AAC, FLAC, or OGG audio file.";
    return;
  }
  analysisState.value = "idle";
}

async function analyzeCall() {
  const file = selectedFile.value;
  if (!file) {
    analysisState.value = "fail";
    analysisError.value = "Select an audio file before starting the analysis.";
    return;
  }

  activeController?.abort();
  resetReplay();
  analysisState.value = "processing";
  analysisError.value = null;
  const controller = new AbortController();
  activeController = controller;

  try {
    const response = await transcribeAudio(file, { signal: controller.signal });
    if (controller.signal.aborted) return;

    audioObjectUrl = URL.createObjectURL(file);
    conversation.value = { ...response.data, audioUrl: audioObjectUrl };
    warnings.value = response.warnings;
    analysisState.value = "success";
    playerSession.value += 1;
  } catch (error) {
    if (controller.signal.aborted || (error instanceof DOMException && error.name === "AbortError")) {
      analysisState.value = "idle";
      return;
    }
    analysisState.value = "fail";
    analysisError.value =
      error instanceof TranscriptionRequestError
        ? error.message
        : "The audio analysis could not be completed. Please try again.";
  } finally {
    if (activeController === controller) activeController = null;
  }
}

function cancelAnalysis() {
  activeController?.abort();
  activeController = null;
  analysisState.value = "idle";
  analysisError.value = null;
}

async function replayEvent(event: ReplayEvent) {
  selectedEvent.value = event;
  notice.value = null;
  await nextTick();
  await player.value?.replayEvent?.(event);
}

function selectEvent(event: ReplayEvent) {
  selectedEvent.value = event;
  notice.value = null;
}

function deselectEvent() {
  selectedEvent.value = null;
}

function seekToTranscript(seconds: number) {
  player.value?.seekTo(seconds);
  playingEventId.value = null;
}

function handlePlaybackChange(playing: boolean, eventId: string | null) {
  isPlaying.value = playing;
  playingEventId.value = playing ? eventId : null;
}

function handleDurationReady(duration: number) {
  audioDuration.value = duration;
  if (conversation.value) conversation.value.durationSec = duration;
}

function showNotice(message: string) {
  notice.value = message;
  if (noticeTimer !== null) window.clearTimeout(noticeTimer);
  noticeTimer = window.setTimeout(() => {
    notice.value = null;
    noticeTimer = null;
  }, 5000);
}

onBeforeUnmount(() => {
  activeController?.abort();
  if (noticeTimer !== null) window.clearTimeout(noticeTimer);
  revokeAudioUrl();
});
</script>

<template>
  <div class="app-shell">
    <Header :call-id="conversation?.callId ?? 'NO CALL SELECTED'" :state="analysisState" />

    <main class="page-content">
      <AudioUpload
        :file-name="selectedFile?.name ?? null"
        :state="analysisState"
        :error-message="analysisError"
        @select="selectFile"
        @analyze="analyzeCall"
        @cancel="cancelAnalysis"
      />

      <template v-if="analysisState === 'success' && conversation">
        <div v-if="warnings.length" class="warning-banner" role="status">
          <AlertTriangle :size="18" />
          <div>
            <strong>Analysis completed with {{ warnings.length }} warning{{ warnings.length === 1 ? "" : "s" }}</strong>
            <ul><li v-for="warning in warnings" :key="warning">{{ warning }}</li></ul>
          </div>
        </div>

        <CallSummary :summary="conversation.callSummary" />

        <AudioPlayer
          :key="playerSession"
          ref="player"
          :audio-url="conversation.audioUrl"
          :replay-events="conversation.replayEvents"
          :selected-event="selectedEvent"
          @time-update="currentTime = $event"
          @duration-ready="handleDurationReady"
          @playback-change="handlePlaybackChange"
          @event-complete="playingEventId = null"
          @request-replay="replayEvent"
          @error="showNotice"
        />

        <div v-if="notice" class="toast" role="status">{{ notice }}</div>

        <div class="review-grid">
          <ReplayTimeline
            :events="conversation.replayEvents"
            :selected-event="selectedEvent"
            :playing-event-id="playingEventId"
            :audio-duration="audioDuration"
            :fallback-duration="conversation.durationSec"
            @select="selectEvent"
            @deselect="deselectEvent"
            @replay="replayEvent"
          />
          <TranscriptPanel
            :transcript="conversation.transcript"
            :selected-event="selectedEvent"
            :current-time="currentTime"
            @seek="seekToTranscript"
          />
        </div>
      </template>

      <section v-else-if="analysisState === 'idle'" class="empty-workspace" aria-label="No analyzed call">
        <span><AudioLines :size="28" /></span>
        <h2>Ready to analyze a conversation</h2>
        <p>Choose a recording above to create an AI summary, important replay moments, and transcript evidence.</p>
      </section>
    </main>

    <footer class="app-footer">
      <span>AI Conversation Replay</span>
      <span>{{ isPlaying ? "Review in progress" : analysisState === "success" ? "Ready for review" : "Upload a call to begin" }}</span>
    </footer>
  </div>
</template>
