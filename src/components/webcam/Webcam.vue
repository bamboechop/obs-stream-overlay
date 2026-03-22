<template>
  <WindowFrame
    :active
    class="rounded-tr-sm max-w-[1920px]"
    :icon-path="programInformation.webcam.iconPath"
    :title="title ?? 'Webcam'">
    <div
      class="rounded-b-sm rounded-t-xs w-full"
      :class="{
        'aspect-square': aspectRatio === '1' || aspectRatio === '1:1' || aspectRatio === '1/1',
        'aspect-video': aspectRatio === '16:9' || aspectRatio === '16/9',
      }"></div>
  </WindowFrame>
</template>

<script lang="ts" setup>
import WindowFrame from '@/components/desktop/WindowFrame.vue';
import { useProgramInformationComposable } from '@/composables/program-information.composable';

defineProps<{
  active?: boolean;
  aspectRatio: string;
  title?: string;
}>();

const { programInformation } = useProgramInformationComposable();
</script>
