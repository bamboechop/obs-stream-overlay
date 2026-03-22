<template>
  <WindowFrame
    :active="active"
    class="w-max"
    :icon-path="programInformation['schedule'].iconPath"
    title="Streamplan">
    <div class="bg-[#0e0e10] rounded-sm text-white pt-[39px]">
      <img
        alt="Streamplan"
        class="rounded-sm block zoom-375"
        src="https://bamboechop.at/schedule.png" />
    </div>
  </WindowFrame>
</template>

<script lang="ts" setup>
import WindowFrame from '@/components/desktop/WindowFrame.vue';
import { useProgramInformationComposable } from '@/composables/program-information.composable';

defineProps<{ active?: boolean }>();

const { programInformation } = useProgramInformationComposable();
</script>

<style scoped>
.zoom-375 {
  zoom: 0.375;
}
</style>