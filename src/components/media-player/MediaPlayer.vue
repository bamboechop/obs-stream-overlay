<template>
  <WindowFrame
    :active="active"
    class="w-full"
    :icon-path="iconPath"
    :title="category">
    <div class="aspect-video text-white max-h-[calc(100vh-38px)]"></div>
  </WindowFrame>
</template>

<script lang="ts" setup>
import { storeToRefs } from 'pinia';
import WindowFrame from '@/components/desktop/WindowFrame.vue';
import { useProgramInformationComposable } from '@/composables/program-information.composable';
import { useTwitchStore } from '@/stores/twitch.store';

defineProps<{ active?: boolean }>();

const store = useTwitchStore();
const { category } = storeToRefs(store);

const { iconPath } = useProgramInformationComposable();
</script>
