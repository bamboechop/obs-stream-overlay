<template>
  <div
    class="flex gap-2 h-[100px] opacity-0 transition-all duration-500 ease-in-out"
    :class="{ 'opacity-100': isVisible }">
    <template v-if="!hideAlbumArt && currentTrack.albumArt">
      <img
        :alt="`Album art for ${currentTrack.name} by ${currentTrack.artist}`"
        class="aspect-square rounded-[10px] shrink-0 object-cover overflow-hidden w-[100px]"
        :src="currentTrack.albumArt" />
    </template>
    <div class="text-white relative text-shadow-[2px_2px_2px_rgba(0,0,0,0.5)] w-full">
      <template v-if="currentTrack.albumArt">
        <div class="rounded-[10px] h-full opacity-90 overflow-hidden absolute w-full">
          <img
            alt=""
            class="blur-[20px] left-1/2 absolute top-1/2 -translate-1/2 w-[140%]"
            :src="currentTrack.albumArt" />
        </div>
      </template>
      <div class="bg-black/35 rounded-[10px] flex flex-col h-full justify-center px-5 relative">
        <div class="text-[20px] font-bold leading-normal overflow-hidden text-ellipsis whitespace-nowrap w-full">
          {{ currentTrack.name }}
        </div>
        <div class="text-sm font-normal leading-normal overflow-hidden text-ellipsis w-full whitespace-nowrap">
          {{ currentTrack.artist }}
        </div>
        <div class="flex flex-row text-sm font-bold justify-between">
          <span>{{ formatTime(currentTrack.currentPlaybackTime) }}</span>
          <span>-{{ formatTime(currentTrack.currentPlaybackTimeRemaining) }}</span>
        </div>
        <div class="bg-[#1f1f1f] rounded-full mt-1.5">
          <div
            class="music-player__progress-bar bg-white rounded-full h-1.5 transition-all duration-500 ease-linear"
            :style="{ width: `${progressPercentage}%` }"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useCiderComposable } from '@/composables/cider.composable';
import { useSearchParamsComposable } from '@/composables/search-params.composable';
import type { ICiderApiMessage, ICiderArtwork, ICiderPlaybackData, ICiderPlaybackStateData, ICiderPlaybackTimeData } from '@/common/interfaces/cider.interface';

const { musicPlayerDuration, hideAlbumArt } = useSearchParamsComposable();
const cider = useCiderComposable();

const isVisible = ref(false);
const visibilityTimeout = ref<ReturnType<typeof setTimeout> | null>(null);

const currentTrack = ref({
  albumArt: '',
  artist: '',
  currentPlaybackDuration: 0,
  currentPlaybackTime: 0,
  currentPlaybackTimeRemaining: 0,
  name: '',
});

const progressPercentage = computed(() => {
  if (currentTrack.value.currentPlaybackDuration === 0) {
    return 0;
  }
  return (currentTrack.value.currentPlaybackTime / currentTrack.value.currentPlaybackDuration) * 100;
});

function formatTime(timeInSeconds: number): string {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.trunc(timeInSeconds - minutes * 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function getAlbumArtUrl(artwork: ICiderArtwork): string {
  return artwork.url.replace('{w}', '180').replace('{h}', '180');
}

function setVisibility(visible: boolean) {
  isVisible.value = visible;

  if (visibilityTimeout.value) {
    clearTimeout(visibilityTimeout.value);
    visibilityTimeout.value = null;
  }

  if (visible && musicPlayerDuration.value > 0) {
    visibilityTimeout.value = setTimeout(() => {
      setVisibility(false);
    }, musicPlayerDuration.value * 1000);
  }
}

function updateSongInfo(data: ICiderPlaybackData) {
  const albumArtUrl = getAlbumArtUrl(data.artwork);

  setTimeout(() => {
    currentTrack.value.albumArt = albumArtUrl;
  }, 250);

  setTimeout(() => {
    currentTrack.value.name = data.name;
    currentTrack.value.artist = data.artistName;
  }, 500);
}

function updateProgressBar(data: ICiderPlaybackTimeData) {
  currentTrack.value.currentPlaybackTime = data.currentPlaybackTime;
  currentTrack.value.currentPlaybackDuration = data.currentPlaybackDuration;
  currentTrack.value.currentPlaybackTimeRemaining = data.currentPlaybackTimeRemaining;
}

function updatePlaybackState(data: ICiderPlaybackStateData) {
  switch (data.state) {
    case 'paused':
    case 'stopped':
      setVisibility(false);
      break;
    case 'playing':
      if (data.attributes) {
        updateSongInfo(data.attributes);
        setTimeout(() => {
          setVisibility(true);
        }, 500);
      }
      break;
  }
}

onMounted(() => {
  cider.on<ICiderApiMessage>('API:Playback', (message) => {
    switch (message.type) {
      case 'playbackStatus.nowPlayingItemDidChange':
        updateSongInfo(message.data as ICiderPlaybackData);
        updatePlaybackState({ attributes: message.data as ICiderPlaybackData, state: 'playing' });
        break;
      case 'playbackStatus.playbackTimeDidChange':
        updateProgressBar(message.data as ICiderPlaybackTimeData);
        break;
      case 'playbackStatus.playbackStateDidChange':
        updatePlaybackState(message.data as ICiderPlaybackStateData);
        break;
    }
  });
});
</script>
