<template>
  <div class="text-white flex font-doto font-semibold text-7xl text-shadow-[0_0_10px_#000]">
    <template v-if="totalSeconds >= 3600">
      <span>{{ hours }}</span>
      <span class="text-6xl -mt-0.5">:</span>
    </template>
    <template v-if="totalSeconds >= 60">
      <span>{{ minutes }}</span>
      <span class="text-6xl -mt-0.5">:</span>
    </template>
    <span>{{ seconds }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';

const props = defineProps<{ totalSeconds: number }>();

const currentSeconds = ref(props.totalSeconds || 0);
const isRunning = ref(false);
let intervalId: number | null = null;

watch(() => props.totalSeconds, (newValue, oldValue) => {
  if (newValue === 0) {
    currentSeconds.value = 0;
  } else {
    const difference = (newValue || 0) - (oldValue || 0);
    currentSeconds.value = currentSeconds.value + difference;
  }
});

const hours = computed(() => {
  const total = currentSeconds.value;
  return Math.floor(total / 3600);
});

const minutes = computed(() => {
  const total = currentSeconds.value;
  const remainingSeconds = total % 3600;
  const mins = Math.floor(remainingSeconds / 60);
  return mins.toString().padStart(2, '0');
});

const seconds = computed(() => {
  const total = currentSeconds.value;
  const secs = total % 60;
  return secs.toString().padStart(2, '0');
});

function pause() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  isRunning.value = false;
}

function start() {
  if (!isRunning.value && currentSeconds.value > 0) {
    isRunning.value = true;
    intervalId = setInterval(() => {
      if (currentSeconds.value > 0) {
        currentSeconds.value--;
      } else {
        pause();
      }
    }, 1000);
  }
}

onUnmounted(() => {
  if (intervalId) {
    clearInterval(intervalId);
  }
});

defineExpose({
  pause,
  start,
});
</script>
