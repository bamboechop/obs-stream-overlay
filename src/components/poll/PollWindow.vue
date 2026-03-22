<template>
  <Transition name="poll-window-slide">
    <div
      v-if="currentPoll"
      class="bg-[linear-gradient(90deg,rgba(34,34,34,0.9)_0%,rgba(34,34,34,0.9)_83%,rgba(34,34,34,0)_100%)] border-b text-white flex flex-col gap-3 h-full pt-[18px] px-3 pb-6 w-[25vw]">
      <div class="flex flex-col gap-1 max-w-[20vw] w-full">
        <aside class="self-end gap-3 flex flex-row opacity-80">
          <div class="items-end gap-1 flex flex-row text-sm justify-end">
            {{ amountOfVotes }}
            <Users :size="16" />
          </div>
          <div class="items-end gap-1 flex flex-row text-sm justify-end">
            {{ displayTime }}
            <Timer :size="16" />
          </div>
        </aside>

        <header class="items-start gap-1.5 grid grid-cols-[18px_1fr]">
          <Component
            :is="pollStatusIcon"
            class="mt-1"
            :size="18" />
          <h1 class="text-lg font-semibold leading-5 m-0">
            {{ currentPoll.title }}
          </h1>
        </header>

        <div
          class="flex flex-col gap-3 mt-5"
          :class="optionsClasses">
          <PollOption
            v-for="choice in currentPoll.choices"
            :key="choice.id"
            :choice="choice"
            :is-winner="isWinner(choice.id)"
            :displayed-votes="getDisplayedVotes(choice.id)"
            :displayed-percent="getDisplayedPercent(choice.id)"
            :displayed-percent-bar="getDisplayedPercentBar(choice.id)"
            :vote-text="getVoteText(choice.id)" />
        </div>
      </div>
    </div>
  </Transition>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { Square, SquareCheckBig, Timer, Users } from 'lucide-vue-next';
import PollOption from './PollOption.vue';
import { useEventStreamComposable } from '@/composables/event-stream.composable';
import type {
  TwitchEventSubNotificationChannelPollBeginEventDto,
  TwitchEventSubNotificationChannelPollEndEventDto,
  TwitchEventSubNotificationChannelPollProgressEventDto,
} from '@/common/interfaces/event-stream.interface';

type TwitchEventSubNotificationChannelPoll =
  | TwitchEventSubNotificationChannelPollBeginEventDto
  | TwitchEventSubNotificationChannelPollProgressEventDto
  | TwitchEventSubNotificationChannelPollEndEventDto;

// Constants for better maintainability
const ANIMATION_DURATION = 500;
const POLL_DISPLAY_DURATION = 5000;
const COUNTDOWN_INTERVAL = 1000;

const { on } = useEventStreamComposable();
const currentPoll = ref<TwitchEventSubNotificationChannelPoll | null>(null);
const amountOfVotes = ref<number>(0);
const remainingTime = ref<number>(0);
let countdownInterval: number | null = null;
const displayedVotes = ref<{ [id: string]: number }>({});
const displayedPercent = ref<{ [id: string]: number }>({});
const displayedPercentBar = ref<{ [id: string]: number }>({});

// Store event listener cleanup functions
const eventCleanupFunctions: (() => void)[] = [];

// Audio elements
const pollStartAudio = ref<HTMLAudioElement | null>(null);
const pollEndAudio = ref<HTMLAudioElement | null>(null);

// Animation state management
interface AnimationState {
  id: string;
  property: 'votes' | 'percent' | 'percentBar';
  from: number;
  to: number;
  startTime: number;
  round: boolean;
}

const activeAnimations = ref<AnimationState[]>([]);
let animationFrameId: number | null = null;

// Debouncing for rapid updates
let updateTimeoutId: number | null = null;

const displayTime = computed(() => {
  const minutes = Math.floor(remainingTime.value / 60);
  const seconds = remainingTime.value % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

const pollEnded = computed(() => Boolean(currentPoll.value && 'status' in currentPoll.value));

const winnerIds = computed(() => {
  if (!currentPoll.value || !('status' in currentPoll.value)) {
    return [];
  }

  // Cache the choices array to avoid repeated property access
  const choices = currentPoll.value.choices;
  if (!choices.length) {
    return [];
  }

  // Find max votes in a single pass
  let maxVotes = choices[0].votes;
  for (let i = 1; i < choices.length; i++) {
    if (choices[i].votes > maxVotes) {
      maxVotes = choices[i].votes;
    }
  }

  // Collect winners in a single pass
  const winners: string[] = [];
  for (const choice of choices) {
    if (choice.votes === maxVotes) {
      winners.push(choice.id);
    }
  }

  return winners;
});

const pollStatusIcon = computed(() => pollEnded.value ? SquareCheckBig : Square);

const optionsClasses = computed(() => ({
  'poll-window__options--winner': pollEnded.value,
}));

function isWinner(choiceId: string): boolean {
  return Boolean(pollEnded.value && winnerIds.value.includes(choiceId));
}

function getDisplayedVotes(choiceId: string): number {
  const votes = displayedVotes.value[choiceId];
  return typeof votes === 'number' && !Number.isNaN(votes) ? votes : 0;
}

function getDisplayedPercent(choiceId: string): number {
  return displayedPercent.value[choiceId] ?? 0;
}

function getDisplayedPercentBar(choiceId: string): number {
  return displayedPercentBar.value[choiceId] ?? 0;
}

function getVoteText(choiceId: string): string {
  const votes = getDisplayedVotes(choiceId);
  return votes === 1 ? 'Stimme' : 'Stimmen';
}

function calculateTotalVotes(choices: TwitchEventSubNotificationChannelPoll['choices']): number {
  return choices.reduce((acc, choice) => acc + choice.votes, 0);
}

function updateDisplayedValue(id: string, property: 'votes' | 'percent' | 'percentBar', value: number) {
  switch (property) {
    case 'votes':
      displayedVotes.value[id] = value;
      break;
    case 'percent':
      displayedPercent.value[id] = value;
      break;
    case 'percentBar':
      displayedPercentBar.value[id] = value;
      break;
  }
}

function batchAnimate() {
  const now = performance.now();
  const remainingAnimations: AnimationState[] = [];

  activeAnimations.value.forEach((animation) => {
    const elapsed = now - animation.startTime;
    const progress = Math.min(elapsed / ANIMATION_DURATION, 1);

    const value = animation.round
      ? Math.round(animation.from + (animation.to - animation.from) * progress)
      : animation.from + (animation.to - animation.from) * progress;

    updateDisplayedValue(animation.id, animation.property, value);

    if (progress < 1) {
      remainingAnimations.push(animation);
    }
  });

  activeAnimations.value = remainingAnimations;

  if (remainingAnimations.length > 0) {
    animationFrameId = requestAnimationFrame(batchAnimate);
  } else {
    animationFrameId = null;
  }
}

function addAnimation(id: string, property: 'votes' | 'percent' | 'percentBar', from: number, to: number, round: boolean = true) {
  // Remove existing animation for this id and property
  activeAnimations.value = activeAnimations.value.filter(
    anim => !(anim.id === id && anim.property === property),
  );

  // Add new animation
  activeAnimations.value.push({
    id,
    property,
    from: typeof from === 'number' && !Number.isNaN(from) ? from : 0,
    to: typeof to === 'number' && !Number.isNaN(to) ? to : 0,
    startTime: performance.now(),
    round,
  });

  // Start animation loop if not already running
  if (!animationFrameId) {
    animationFrameId = requestAnimationFrame(batchAnimate);
  }
}

function updateDisplayedVotesAndPercent(
  choices: TwitchEventSubNotificationChannelPoll['choices'],
  totalVotes: number,
) {
  choices.forEach((choice: TwitchEventSubNotificationChannelPoll['choices'][number]) => {
    const prevVotes = displayedVotes.value[choice.id] ?? 0;
    const newVotes = choice.votes;
    if (prevVotes !== newVotes) {
      addAnimation(choice.id, 'votes', prevVotes, newVotes, true);
    }

    const prevPercent = displayedPercent.value[choice.id] ?? 0;
    const newPercent = totalVotes > 0 ? Math.round((choice.votes / totalVotes) * 100) : 0;
    if (prevPercent !== newPercent) {
      addAnimation(choice.id, 'percent', prevPercent, newPercent, true);
    }

    const prevPercentBar = displayedPercentBar.value[choice.id] ?? 0;
    const newPercentBar = totalVotes > 0 ? (choice.votes / totalVotes) * 100 : 0;
    if (prevPercentBar !== newPercentBar) {
      addAnimation(choice.id, 'percentBar', prevPercentBar, newPercentBar, false);
    }
  });
}

function debouncedUpdateDisplayedVotesAndPercent(
  choices: TwitchEventSubNotificationChannelPoll['choices'],
  totalVotes: number,
) {
  // Clear existing timeout
  if (updateTimeoutId) {
    clearTimeout(updateTimeoutId);
  }

  // Debounce rapid updates
  updateTimeoutId = window.setTimeout(() => {
    updateDisplayedVotesAndPercent(choices, totalVotes);
    updateTimeoutId = null;
  }, 16); // ~60fps
}

function clearCountdownInterval() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
}

function stopAllAnimations() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  activeAnimations.value = [];
}

function cleanup() {
  clearCountdownInterval();
  stopAllAnimations();

  // Clear any pending debounced updates
  if (updateTimeoutId) {
    clearTimeout(updateTimeoutId);
    updateTimeoutId = null;
  }

  // Clean up all event listeners
  eventCleanupFunctions.forEach(cleanupFn => cleanupFn());
  eventCleanupFunctions.length = 0;
}

function initializeDisplayedValues(choices: TwitchEventSubNotificationChannelPoll['choices']) {
  // Clear existing values
  Object.keys(displayedVotes.value).forEach((key) => {
    delete displayedVotes.value[key];
  });
  Object.keys(displayedPercent.value).forEach((key) => {
    delete displayedPercent.value[key];
  });
  Object.keys(displayedPercentBar.value).forEach((key) => {
    delete displayedPercentBar.value[key];
  });

  // Initialize with new values
  choices.forEach((choice) => {
    displayedVotes.value[choice.id] = 0;
    displayedPercent.value[choice.id] = 0;
    displayedPercentBar.value[choice.id] = 0;
  });
}

function initializeAudio() {
  pollStartAudio.value = new Audio('/audio/poll-start.mp3');
  pollEndAudio.value = new Audio('/audio/poll-end.mp3');

  pollStartAudio.value.volume = 1;
  pollEndAudio.value.volume = 0.4;

  pollStartAudio.value.load();
  pollEndAudio.value.load();
}

function playPollStartSound() {
  if (pollStartAudio.value) {
    pollStartAudio.value.currentTime = 0;
    pollStartAudio.value.play().catch((error) => {
      console.warn('Failed to play poll start sound:', error);
    });
  }
}

function playPollEndSound() {
  if (pollEndAudio.value) {
    pollEndAudio.value.currentTime = 0;
    pollEndAudio.value.play().catch((error) => {
      console.warn('Failed to play poll end sound:', error);
    });
  }
}

onMounted(() => {
  initializeAudio();

  const beginCleanup = on<TwitchEventSubNotificationChannelPollBeginEventDto>('channel.poll.begin', (data) => {
    currentPoll.value = data;
    remainingTime.value = Math.floor((new Date(data.ends_at).getTime() - new Date().getTime()) / 1000);
    initializeDisplayedValues(data.choices);
    updateDisplayedVotesAndPercent(data.choices, 0);

    playPollStartSound();

    clearCountdownInterval();
    countdownInterval = window.setInterval(() => {
      remainingTime.value--;
      if (remainingTime.value <= 0) {
        clearCountdownInterval();
      }
    }, COUNTDOWN_INTERVAL);
  });

  const progressCleanup = on<TwitchEventSubNotificationChannelPollProgressEventDto>('channel.poll.progress', (data) => {
    currentPoll.value = data;
    amountOfVotes.value = calculateTotalVotes(data.choices);
    debouncedUpdateDisplayedVotesAndPercent(data.choices, amountOfVotes.value);
  });

  const endCleanup = on<TwitchEventSubNotificationChannelPollEndEventDto>('channel.poll.end', (data) => {
    amountOfVotes.value = calculateTotalVotes(data.choices);
    currentPoll.value = data;
    remainingTime.value = 0;
    debouncedUpdateDisplayedVotesAndPercent(data.choices, amountOfVotes.value);
    clearCountdownInterval();

    playPollEndSound();

    window.setTimeout(() => {
      currentPoll.value = null;
    }, POLL_DISPLAY_DURATION);
  });

  // Store cleanup functions
  eventCleanupFunctions.push(beginCleanup, progressCleanup, endCleanup);
});

onUnmounted(() => {
  cleanup();
});
</script>

<style scoped>
.poll-window-slide-enter-active,
.poll-window-slide-leave-active {
  transition: transform 0.5s cubic-bezier(0.4,0,0.2,1), opacity 0.5s cubic-bezier(0.4,0,0.2,1);
}
.poll-window-slide-enter-from,
.poll-window-slide-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}
.poll-window-slide-enter-to,
.poll-window-slide-leave-from {
  transform: translateX(0);
  opacity: 1;
}
</style>
