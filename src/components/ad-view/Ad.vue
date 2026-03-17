<template>
  <div>
    <div
      v-if="debug"
      class="flex gap-2 fixed right-2.5 top-2.5 z-9999">
      <button
        class="bg-blue-950 border-0 rounded-sm text-white text-sm py-2 px-3 transition-colors hover:bg-blue-800"
        @click="triggerDebugCountdown">
        Debug: 1min Countdown
      </button>
      <button
        class="bg-blue-950 border-0 rounded-sm text-white text-sm py-2 px-3 transition-colors hover:bg-blue-800"
        @click="triggerDebugAd">
        Debug: 30s Ad
      </button>
    </div>
    <WindowFrame
      class="ad-window bg-white/75 rounded-none rounded-r-lg border! bottom-0 overflow-hidden -left-[105%] fixed! transition-all! duration-500 ease-in-out w-full"
      :class="{ 'left-0': diffInSeconds < 10 * 60 && diffInSeconds >= 0 }"
      :style="duration > 0 ? { '--duration': `${duration}s` } : {}">
      <div class="flex flex-col items-center justify-center gap-1 py-2 px-4 min-h-14">
        <template v-if="diffInSeconds > 0">
          <span class="text-sm leading-none">
            Nächste geplante Werbepause in
          </span>
        </template>
        <span class="text-xl leading-none font-semibold tabular-nums">
          {{ remainingTime }}
        </span>
      </div>
    </WindowFrame>
  </div>
</template>

<script lang="ts" setup>
import { storeToRefs } from 'pinia';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import WindowFrame from '@/components/desktop/WindowFrame.vue';
import { useTwitchStore } from '@/stores/twitch.store';
import { useStreamStatusStore } from '@/stores/stream-status.store';
import { useSearchParamsComposable } from '@/composables/search-params.composable';

const { debug } = useSearchParamsComposable();

const streamStatusStore = useStreamStatusStore();
const { live } = storeToRefs(streamStatusStore);

const twitchStore = useTwitchStore();
const { adDuration, adSchedule, isAdRunning } = storeToRefs(twitchStore);
const { getAdSchedule, initializeAdBreakListener } = twitchStore;

const diffInSeconds = ref(-1);
const remainingTime = ref('');
const duration = ref<number>(0);

let adScheduleFetchInterval = 0;

function clearAdScheduleInterval() {
  if (adScheduleFetchInterval !== 0) {
    window.clearInterval(adScheduleFetchInterval);
    adScheduleFetchInterval = 0;
  }
}
watch(() => adSchedule.value, (newValue) => {
  clearAdScheduleInterval();
  duration.value = 0;

  // check if newValue doesn't exist or if nextTime is a date in the past
  if (!newValue || newValue.nextTime < new Date().getTime()) {
    return;
  }

  updateRemainingTime();
  adScheduleFetchInterval = window.setInterval(updateRemainingTime, 1000);
});

watch(live, (newValue) => {
  if (!newValue) {
    clearAdScheduleInterval();
    diffInSeconds.value = -1;
    duration.value = 0;
  }
});

// Watch store's isAdRunning and adDuration to update UI
watch([isAdRunning, adDuration], ([running, durationSeconds]) => {
  if (running && durationSeconds > 0) {
    clearAdScheduleInterval();
    diffInSeconds.value = 0;
    remainingTime.value = 'Werbung läuft, bis gleich.';
    duration.value = durationSeconds;

    // Clean up after the duration
    window.setTimeout(() => {
      diffInSeconds.value = -1;
      duration.value = 0;
    }, durationSeconds * 1000);

    // Fetch new ad schedule after ad ends
    window.setTimeout(async () => {
      await getAdSchedule();
    }, (durationSeconds + 30) * 1000);
  } else if (!running && duration.value > 0) {
    // Ad finished, reset local duration display
    duration.value = 0;
    diffInSeconds.value = -1;
  }
});

function updateRemainingTime() {
  if (!adSchedule.value) {
    return;
  }

  const now = new Date();

  diffInSeconds.value = Math.max(0, Math.floor((adSchedule.value.nextTime - now.getTime()) / 1000));

  if (diffInSeconds.value === 0) {
    clearAdScheduleInterval();
    if (debug) {
      window.setTimeout(() => {
        if (adSchedule.value) {
          // Simulate ad break by directly setting store values
          isAdRunning.value = true;
          adDuration.value = adSchedule.value.duration;
          
          // Set timeout to mark ad as finished after duration
          window.setTimeout(() => {
            isAdRunning.value = false;
            adDuration.value = 0;
          }, adSchedule.value.duration * 1000);
        }
      }, 3000);
    }
  }

  const minutes = Math.floor(diffInSeconds.value / 60);
  const seconds = diffInSeconds.value % 60;
  const displaySeconds = minutes > 0 ? seconds.toString(10).padStart(2, '0') : seconds;

  if (minutes > 1) {
    remainingTime.value = `${minutes} Minuten und ${displaySeconds} Sekunden`;
  } else if (minutes === 1) {
    remainingTime.value = `${minutes} Minute und ${displaySeconds} Sekunden`;
  } else if (seconds > 1) {
    remainingTime.value = `${displaySeconds} Sekunden`;
  } else if (seconds === 1) {
    remainingTime.value = `${displaySeconds} Sekunde`;
  } else {
    remainingTime.value = 'Werbung beginnt jeden Moment.';
  }
}

onMounted(() => {
  // Initialize store's ad break listener
  initializeAdBreakListener();

  if (debug) {
    document.body.style.backgroundColor = 'saddlebrown';
  }
});

onBeforeUnmount(() => {
  clearAdScheduleInterval();
});

function triggerDebugCountdown() {
  clearAdScheduleInterval();

  // Set next ad time to 1 minute from now
  const nextTime = new Date();
  nextTime.setMinutes(nextTime.getMinutes() + 1);

  // Simulate adSchedule update
  adSchedule.value = {
    nextTime: nextTime.getTime(),
    duration: 30, // Default duration for the upcoming ad
  };

  updateRemainingTime();
  adScheduleFetchInterval = window.setInterval(updateRemainingTime, 1000);
}

function triggerDebugAd() {
  // Simulate ad break by directly setting store values
  isAdRunning.value = true;
  adDuration.value = 30;
  
  // Set timeout to mark ad as finished after duration
  window.setTimeout(() => {
    isAdRunning.value = false;
    adDuration.value = 0;
  }, 180 * 1000);
}
</script>

<style scoped>
@reference 'tailwindcss';

@keyframes decreaseWidth {
  from {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(0);
  }
}

.ad-window {
  &::before {
    @apply bg-[#1e4e00] bottom-0 content-[''] left-0 opacity-0 absolute right-0 top-0 origin-left w-full -z-1;

    animation: none;
    will-change: transform;
  }

  &[style*="--duration"] {
    &::before {
      animation: decreaseWidth var(--duration) linear forwards;
      opacity: 0.5;
    }
  }
}
</style>
