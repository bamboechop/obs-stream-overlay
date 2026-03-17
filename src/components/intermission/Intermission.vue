<template>
  <WindowFrame
    :active
    class="w-full">
    <div class="aspect-video bg-[#121212] bg-center bg-no-repeat bg-cover rounded-sm overflow-hidden relative w-full">
      <span
        class="text-white block text-[60px] text-shadow-[0_0_10px_#000] w-full left-0 absolute right-0 z-1"
        :class="[
          {
            'px-6 py-8 text-center top-0': ['break', 'start', undefined].includes(mode),
            'py-7 pr-6 pl-[256px] top-1/2 -translate-y-1/2': mode === 'end',
          },
        ]"
        :style="['break', 'start', undefined].includes(mode) ? { backgroundColor: startingSoonTextBackgroundColor } : undefined">
        {{ intermissionText }}
      </span>
      <template v-if="mode === 'start' && selectedTrailerData">
        <span
          class="rounded-sm bg-black/75 bottom-[200px] text-white text-2xl left-1/2 opacity-0 px-5 py-3 pointer-events-none absolute -translate-x-1/2 transition-opacity duration-1000 ease-in-out z-1"
          :class="{ 'opacity-100': isVideoTextVisible }">
          {{ selectedTrailerData.title }}
        </span>
      </template>
      <img
        alt=""
        class="absolute"
        :class="{
          'animate-[intermission-scale-up-down_15s_ease-in-out_infinite_alternate] h-full object-cover w-full': ['break', 'start', undefined].includes(mode),
          'animate-none bottom-0 h-auto left-0 opacity-25 w-[600px]': mode === 'end',
        }"
        :src="startingSoonImage" />
      <video
        v-if="mode === 'start' && selectedTrailerData"
        ref="trailerVideoRef"
        class="h-full object-cover opacity-0 absolute w-full transition-opacity duration-1000 ease-in-out"
        :class="{ 'opacity-100': isVideoVisible }"
        playsinline
        preload="auto"
        :src="selectedTrailerData.url" />
    </div>
  </WindowFrame>
</template>

<script lang="ts" setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useMediaControls } from '@vueuse/core';
import WindowFrame from '@/components/desktop/WindowFrame.vue';
import { useTwitchStore } from '@/stores/twitch.store';
import { useStreamStatusStore } from '@/stores/stream-status.store';
import { useCiderComposable } from '@/composables/cider.composable';
import { GAME_METADATA } from '@/common/constants/game-metadata.constant';
import { TRAILERS_METADATA } from '@/common/constants/trailers-metadata.constant';
import { useApplicationStore } from '@/stores/application.store';

const props = defineProps<{ active?: boolean; mode?: 'end' | 'break' | 'start' }>();

const VIDEO_PLAYBACK_DELAY = 30 * 1000; // 30 seconds after ad ends

const applicationStore = useApplicationStore();
const { intermissionVideoPlaying } = storeToRefs(applicationStore);

const store = useTwitchStore();
const { category, isAdRunning } = storeToRefs(store);

const streamStatusStore = useStreamStatusStore();
const { live } = storeToRefs(streamStatusStore);

const { setVolume } = useCiderComposable();

const trailerVideoRef = ref<HTMLVideoElement | null>(null);
const isVideoVisible = ref(false);
const isVideoTextVisible = ref(false);
let playTimeout: ReturnType<typeof setTimeout> | null = null;
let hideTextTimeout: ReturnType<typeof setTimeout> | null = null;
let hasStartedPlayback = ref(false);
const firstAdFinished = ref(false);

// Initialize ad break listener when component mounts
onMounted(() => {
  store.initializeAdBreakListener();
});

const { playing, ended } = useMediaControls(trailerVideoRef);

const intermissionText = computed(() => {
  if (props.mode === 'end') {
    return 'Danke fürs Zuschauen, bis zum nächsten Mal 👋';
  }

  const { intermissionTextMode } = GAME_METADATA[category.value] ?? 'default';

  switch (props.mode) {
    case 'break':
      if (intermissionTextMode === 'chatting') {
        return '⏰ Kurze Pause, gleich geht es weiter';
      }
      return '⏰ Kurze Pause, gleich geht es weiter mit';
    case 'start':
    default:
      if (intermissionTextMode === 'chatting') {
        return '🥳 Gleich gehts los';
      }
      return '🥳 Gleich gehts los mit';
  }
});

const startingSoonTextBackgroundColor = computed(() => {
  return GAME_METADATA[category.value]?.color ?? 'rgba(115, 117, 80, 0.35)';
});
const selectedTrailerData = computed(() => {
  if (props.mode !== 'start') {
    return null;
  }

  const trailers = TRAILERS_METADATA[category.value as keyof typeof TRAILERS_METADATA];
  if (!trailers) {
    return null;
  }

  // Randomly select a trailer
  const randomIndex = Math.floor(Math.random() * trailers.length);
  return trailers[randomIndex];
});

const startingSoonImage = computed(() => {
  if (props.mode === 'end') {
    return '/bamboechop.png';
  }

  return GAME_METADATA[category.value]?.backgroundImagePath ?? '/modern/game-backgrounds/default.jpg';
});

const startTrailerPlayback = async () => {
  // Only start playback if stream is live and we haven't started yet
  if (props.mode === 'start' && selectedTrailerData.value && live.value && !hasStartedPlayback.value) {
    hasStartedPlayback.value = true;
    
    // Wait for the video element to be created
    await nextTick();
    // Wait a bit more to ensure the video element is fully ready
    await new Promise(resolve => setTimeout(resolve, 100));
    if (trailerVideoRef.value) {
      // Reset visibility state
      isVideoVisible.value = false;
      isVideoTextVisible.value = false;
      
      // Clear any existing timeouts
      if (playTimeout) {
        clearTimeout(playTimeout);
      }
      if (hideTextTimeout) {
        clearTimeout(hideTextTimeout);
      }
      // Start playback after delay
      playTimeout = setTimeout(() => {
        if (trailerVideoRef.value) {
          trailerVideoRef.value.play().catch((error) => {
            console.error('Failed to play trailer video:', error);
          });
        }
      }, VIDEO_PLAYBACK_DELAY);
    }
  }
};

// Fade in when video starts playing
watch(playing, (isPlaying) => {
  intermissionVideoPlaying.value = isPlaying;
  if (isPlaying && props.mode === 'start') {
    isVideoVisible.value = true;
    // Fade in video text when playback starts
    isVideoTextVisible.value = true;
    // Lower Cider volume to 0 when trailer starts (from 1)
    setVolume(1, 0);
    // Fade out video text 5 seconds after playback starts
    hideTextTimeout = setTimeout(() => {
      isVideoTextVisible.value = false;
    }, 5000);
  }
});

// Fade out when video ends
watch(ended, (isEnded) => {
  if (isEnded && props.mode === 'start') {
    isVideoVisible.value = false;
    // Restore Cider volume to 1 when trailer ends (from 0)
    setVolume(0, 1);
  }
});

// Watch for ad finishing to start trailer playback
watch(isAdRunning, (isRunning, wasRunning) => {
  // When ad finishes (goes from true to false) and it's the first ad
  if (wasRunning && !isRunning && !firstAdFinished.value && live.value) {
    firstAdFinished.value = true;
    // Start trailer playback 30 seconds after ad ends
    startTrailerPlayback();
  }
});

// Reset when stream goes offline
watch(live, (isLive) => {
  if (!isLive) {
    hasStartedPlayback.value = false;
    firstAdFinished.value = false;
    if (playTimeout) {
      clearTimeout(playTimeout);
      playTimeout = null;
    }
    if (hideTextTimeout) {
      clearTimeout(hideTextTimeout);
      hideTextTimeout = null;
    }
  }
});

// Watch for changes in selectedTrailerData or mode to handle category/scene changes
// Only trigger if stream is already live and first ad has finished
watch([() => props.mode, selectedTrailerData], () => {
  if (live.value && firstAdFinished.value) {
    hasStartedPlayback.value = false; // Reset to allow restarting with new trailer
    startTrailerPlayback();
  }
});
</script>

<style>
body {
  overflow: hidden; /* for some reason within OBS the body sometimes overflows without any reason */
}

@keyframes intermission-scale-up-down {
  0% {
    transform: scale(1);
  }
  100% {
    transform: scale(1.05);
  }
}
</style>
