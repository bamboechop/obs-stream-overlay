<template>
  <WindowFrame
    :active
    class="rounded-tr-sm max-w-[1920px]"
    :icon-path="programInformation.webcam.iconPath"
    :style="frameSize"
    :title="title ?? 'Webcam'">
    <div
      class="rounded-b-sm rounded-t-xs w-full min-h-0"
      :class="{ 'flex-1': frameSize }"
      :style="{ aspectRatio: frameSize ? undefined : normalizedAspectRatio }"></div>
  </WindowFrame>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import WindowFrame from '@/components/desktop/WindowFrame.vue';
import { useProgramInformationComposable } from '@/composables/program-information.composable';

const props = defineProps<{
  active?: boolean;
  aspectRatio: string;
  size?: string;
  title?: string;
}>();

const { programInformation } = useProgramInformationComposable();

const frameSize = computed(() => {
  const match = props.size?.trim().match(/^(\d+)x(\d+)$/i);
  if (!match) {
    return undefined;
  }

  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 10 || height <= 38) {
    return undefined;
  }

  return { width: `${width}px`, height: `${height}px`, maxWidth: 'none', boxSizing: 'border-box' as const };
});

const normalizedAspectRatio = computed(() => {
  const value = props.aspectRatio.trim();
  if (!/^(?:\d+(?:\.\d+)?|\.\d+)(?:\s*[:/]\s*(?:\d+(?:\.\d+)?|\.\d+))?$/.test(value)) {
    return '16 / 9';
  }

  const [width, height = 1] = value.split(/[:/]/).map(Number);
  if (width === undefined || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return '16 / 9';
  }

  return `${width} / ${height}`;
});
</script>
