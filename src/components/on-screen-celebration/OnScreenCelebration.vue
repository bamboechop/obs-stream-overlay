<template>
  <div class="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
    <TransitionGroup name="on-screen-celebration-float">
      <div
        v-for="emote in activeEmotes"
        :key="emote.id"
        class="absolute transition-all ease-[cubic-bezier(0.23, 1, 0.32, 1)] will-change-transform"
        :style="emote.style">
        <img
          :alt="emote.name"
          class="w-full h-full object-contain"
          :src="emote.src" />
      </div>
    </TransitionGroup>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { useEventStreamComposable } from '@/composables/event-stream.composable';
import type { IEventStreamChannelPointsAutomaticRewardRedemptionAddData } from '@/common/interfaces/event-stream.interface';
import { EMOTES } from '@/common/constants/emotes.constant';

interface FloatingEmote {
  id: number;
  src: string;
  name: string;
  style: {
    'left': string;
    'bottom': string;
    'width': string;
    'transform': string;
    '--duration': string;
    '--target-x': string;
  };
}

const EMOTE_FILES = EMOTES.map(emote => emote.url);

const activeEmotes = ref<FloatingEmote[]>([]);
const celebrationQueue = ref<(() => Promise<void>)[]>([]);
const isCelebrating = ref(false);
let emoteCounter = 0;

function createEmote(): FloatingEmote {
  const size = Math.floor(Math.random() * (56 - 40 + 1)) + 40;
  const leftPos = Math.random() * 100;
  const randomEmote = EMOTE_FILES[Math.floor(Math.random() * EMOTE_FILES.length)];
  const duration = 6.5 + Math.random() * 2.5; // Random between 6.5 and 9 seconds
  const targetX = Math.random() * 1200 - 600; // Random between -600 and 600

  return {
    id: emoteCounter++,
    src: randomEmote,
    name: randomEmote,
    style: {
      'left': `${leftPos}%`,
      'bottom': '-60px',
      'width': `${size}px`,
      'transform': `translateX(0)`,
      '--duration': `${duration}s`,
      '--target-x': `${targetX}px`,
    },
  };
}

async function triggerCelebration(): Promise<void> {
  // Create emotes over 10 seconds, with more frequent spawning
  const totalDuration = 10000; // 10 seconds
  const emoteCount = 100; // Increased for more continuous effect
  const spawnInterval = totalDuration / emoteCount;
  let maxDuration = 0;

  // Create all emotes and track the longest animation duration
  const emotes = Array.from({ length: emoteCount }, () => createEmote());
  emotes.forEach((emote) => {
    const duration = Number.parseFloat(emote.style['--duration']) * 1000;
    maxDuration = Math.max(maxDuration, duration);
  });

  // Spawn emotes over time
  for (let i = 0; i < emoteCount; i++) {
    await new Promise(resolve => setTimeout(resolve, spawnInterval));
    const emote = emotes[i];
    activeEmotes.value.push(emote);

    // Remove the emote after animation
    setTimeout(() => {
      activeEmotes.value = activeEmotes.value.filter(e => e.id !== emote.id);
    }, Number.parseFloat(emote.style['--duration']) * 1000);
  }

  // Wait for the longest animation to complete plus a small buffer
  await new Promise(resolve => setTimeout(resolve, maxDuration + 500));
}

async function processQueue() {
  if (isCelebrating.value || celebrationQueue.value.length === 0) {
    return;
  }

  isCelebrating.value = true;

  while (celebrationQueue.value.length > 0) {
    const nextCelebration = celebrationQueue.value.shift();
    if (nextCelebration) {
      await nextCelebration();
    }
  }

  isCelebrating.value = false;
}

function queueCelebration() {
  celebrationQueue.value.push(triggerCelebration);
  processQueue();
}

const { on } = useEventStreamComposable();

onMounted(() => {
  on<IEventStreamChannelPointsAutomaticRewardRedemptionAddData>('channel.channel_points_automatic_reward_redemption.add', (data) => {
    if (data.reward.type !== 'celebration') {
      return;
    }
    // Twitch currently doesn't provide the user selected emote, therefore we take all emotes located in the public/ directory
    queueCelebration();
  });
});
</script>

<style scoped>
.on-screen-celebration-float-enter-active {
  animation: on-screen-celebration-float-up var(--duration) cubic-bezier(0.23, 1, 0.32, 1);
}

.on-screen-celebration-float-leave-active {
  opacity: 0;
  transition: opacity 0.3s ease;
}

@keyframes on-screen-celebration-float-up {
  0% {
    transform: translateY(0) translateX(0);
  }
  100% {
    transform: translateY(-120vh) translateX(var(--target-x));
  }
}
</style>
