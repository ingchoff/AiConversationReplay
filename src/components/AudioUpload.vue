<script setup lang="ts">
import { AlertCircle, FileAudio, LoaderCircle, RotateCcw, Upload, X } from "lucide-vue-next";
import { ref } from "vue";
import type { AnalysisState } from "../types/conversation";

const props = defineProps<{
  fileName: string | null;
  state: AnalysisState;
  errorMessage: string | null;
}>();

const emit = defineEmits<{
  select: [file: File | null];
  analyze: [];
  cancel: [];
}>();

const input = ref<HTMLInputElement | null>(null);

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  emit("select", target.files?.[0] ?? null);
}

function chooseFile() {
  if (props.state !== "processing") input.value?.click();
}
</script>

<template>
  <section class="surface upload-card" aria-labelledby="upload-heading">
    <div class="upload-copy">
      <span class="upload-icon" aria-hidden="true"><FileAudio :size="22" /></span>
      <div>
        <p class="eyebrow">Analyze a new recording</p>
        <h2 id="upload-heading">Upload call audio</h2>
        <p class="upload-description">Select an audio file to generate its transcript, summary, and replay events.</p>
      </div>
    </div>

    <input
      ref="input"
      class="sr-only"
      type="file"
      accept="audio/*,.wav,.mp3,.m4a,.aac,.flac,.ogg"
      :disabled="state === 'processing'"
      aria-label="Select call audio file"
      @change="handleFileChange"
    />

    <div class="upload-actions">
      <button type="button" class="file-button" :disabled="state === 'processing'" @click="chooseFile">
        <Upload :size="16" />
        {{ fileName ? "Change file" : "Choose audio" }}
      </button>

      <div v-if="fileName" class="selected-file" :title="fileName">
        <FileAudio :size="15" />
        <span>{{ fileName }}</span>
      </div>

      <button
        v-if="state !== 'processing'"
        type="button"
        class="analyze-button"
        :disabled="!fileName"
        @click="emit('analyze')"
      >
        <RotateCcw v-if="state === 'fail' && fileName" :size="16" />
        <Upload v-else :size="16" />
        {{ state === "fail" && fileName ? "Retry analysis" : "Analyze call" }}
      </button>

      <button v-else type="button" class="cancel-button" @click="emit('cancel')">
        <X :size="16" /> Cancel
      </button>
    </div>

    <div v-if="state === 'processing'" class="processing-message" role="status" aria-live="polite">
      <LoaderCircle :size="18" class="spin" />
      <span><strong>Analyzing conversation…</strong> Transcribing audio and identifying important moments.</span>
    </div>

    <div v-else-if="state === 'fail' && errorMessage" class="upload-error" role="alert">
      <AlertCircle :size="18" />
      <span>{{ errorMessage }}</span>
    </div>
  </section>
</template>
