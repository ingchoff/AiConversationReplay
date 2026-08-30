<script setup lang="ts">
import { AlertCircle, AudioLines, CircleCheck, LoaderCircle } from "lucide-vue-next";
import type { AnalysisState } from "../types/conversation";

defineProps<{ callId: string; state: AnalysisState }>();
</script>

<template>
  <header class="app-header">
    <div class="brand-lockup">
      <span class="brand-icon" aria-hidden="true"><AudioLines :size="21" /></span>
      <div>
        <p class="eyebrow">AI Quality Workspace</p>
        <h1>Conversation Replay</h1>
      </div>
    </div>
    <div class="header-meta">
      <span v-if="state === 'success'" class="ready-pill"><CircleCheck :size="14" /> Replay ready</span>
      <span v-else-if="state === 'processing'" class="ready-pill processing"><LoaderCircle :size="14" class="spin" /> Analyzing</span>
      <span v-else-if="state === 'fail'" class="ready-pill failed"><AlertCircle :size="14" /> Analysis failed</span>
      <span class="call-id">{{ callId }}</span>
    </div>
  </header>
</template>
