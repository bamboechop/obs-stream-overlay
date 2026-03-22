<template>
  <section
    class="bg-black/50 rounded-bl-2xl rounded-tl-2xl ml-auto opacity-0 p-4 pl-6 pointer-events-none transition-opacity duration-300 ease-in-out select-none w-max"
    :class="{ 'opacity-100': totalSeconds > 0 }">
    <Timer
      ref="timerElement"
      :total-seconds />
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import Timer from '@/components/timer/Timer.vue';
import { useEventStreamComposable } from '@/composables/event-stream.composable';

const { on } = useEventStreamComposable();

const totalSeconds = ref(0);

const timerElement = ref<InstanceType<typeof Timer>>();

onMounted(() => {
  on('overlay.timer.add', (value: number) => {
    totalSeconds.value += value;
  });

  on('overlay.timer.pause', () => {
    timerElement.value?.pause();
  });

  on('overlay.timer.reset', () => {
    timerElement.value?.pause();
    totalSeconds.value = 0;
  });

  on('overlay.timer.start', () => {
    timerElement.value?.start();
  });
});
</script>
