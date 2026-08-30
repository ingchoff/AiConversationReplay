<script setup lang="ts">
defineProps<{
  label: string;
  tone?: "slate" | "blue" | "emerald" | "amber" | "rose" | "violet";
}>();
</script>

<template>
  <span class="status-badge" :class="`badge-${tone ?? 'slate'}`">{{ label }}</span>
</template>
