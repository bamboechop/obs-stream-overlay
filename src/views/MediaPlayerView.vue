<template>
  <section class="h-screen w-screen">
    <MediaPlayer :active />
  </section>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import MediaPlayer from '@/components/media-player/MediaPlayer.vue';
import { useTwitchStreamInfoComposable } from '@/composables/twitch-stream-info.composable';
import { useApplicationStore } from '@/stores/application.store';

useTwitchStreamInfoComposable(false);

const applicationStore = useApplicationStore();
const { activeProgramId } = storeToRefs(applicationStore);

const active = computed(() => activeProgramId.value === 'media-player');
</script>
