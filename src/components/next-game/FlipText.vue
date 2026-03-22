<template>
  <div
    ref="flipTextElement"
    :data-word="currentWord">
    <div class="flip-card">
      <b
        class="flip-card__top"
        :style="{ width: '100%' }">{{ currentWord }}</b>
      <b
        class="flip-card__bottom"
        :data-value="currentWord"
        :style="{ width: '100%' }"></b>
      <b
        class="flip-card__back"
        :data-value="previousWord"
        :style="{ width: '100%' }"></b>
      <b
        class="flip-card__back-bottom"
        :data-value="previousWord"
        :style="{ width: '100%' }"></b>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

// Props
const props = defineProps<{ words: string[] }>();

// Emits
const emit = defineEmits<{
  wordSelected: [word: string];
}>();

// Template ref
const flipTextElement = ref<HTMLDivElement | null>(null);

const shuffledWords = computed(() => {
  return [...props.words].sort(() => Math.random() - 0.5);
});

// Reactive data
const currentWordIndex = ref(0);
const currentWord = ref('');
const previousWord = ref('');
const isAutoCycling = ref(false);
const autoCycleTimer = ref<number | null>(null);
const autoCycleInterval = ref(100);

// Audio element for the relay switch sound
const audioElement = ref<HTMLAudioElement | null>(null);

// Animation speed configuration
const animationSpeed = ref({
  bottom: 0.1,
  top: 0.05,
});

// Animation progression tracking
const animationStartTime = ref(0);
const animationProgress = ref(0);
const currentAnimationSpeed = ref({ ...animationSpeed.value });

// Animation duration and speed interpolation
const totalAnimationDuration = 15000; // 15 seconds in milliseconds
const maxSpeed = { top: 0.025, bottom: 0.05 }; // Much faster start: 25ms, 50ms
const minSpeed = { top: 1.0, bottom: 2.0 }; // Slower end: 1s, 2s
const maxCycleInterval = 50; // Faster start: 50ms between flips
const minCycleInterval = 3000; // Slower end: 3s between flips

const topAnimationSpeed = computed(() => {
  return `${currentAnimationSpeed.value.top}s`;
});

const bottomAnimationSpeed = computed(() => {
  return `${currentAnimationSpeed.value.bottom}s`;
});

// Methods
function calculateAnimationSpeed(progress: number) {
  // Use a custom easing function that maintains maximum speed for exactly half the duration
  // This creates a curve that starts fast, stays at max speed for 50% of the time, then drops off
  let easedProgress;
  if (progress < 0.33) {
    // Stay at maximum speed for the first 33% of the animation
    easedProgress = 0; // No progression = maximum speed maintained
  } else {
    // Dramatic slowdown in the last 66%
    const remainingProgress = (progress - 0.33) / 0.66; // Normalize to 0-1
    easedProgress = remainingProgress * remainingProgress; // Quadratic curve for dramatic end
  }

  return {
    top: maxSpeed.top + (minSpeed.top - maxSpeed.top) * easedProgress,
    bottom: maxSpeed.bottom + (minSpeed.bottom - maxSpeed.bottom) * easedProgress,
    cycleInterval: maxCycleInterval + (minCycleInterval - maxCycleInterval) * easedProgress,
  };
}

function updateAnimationSpeed() {
  if (!isAutoCycling.value) {
    return;
  }

  const elapsed = Date.now() - animationStartTime.value;
  const progress = Math.min(elapsed / totalAnimationDuration, 1);

  animationProgress.value = progress;
  const newSpeed = calculateAnimationSpeed(progress);
  currentAnimationSpeed.value = {
    top: newSpeed.top,
    bottom: newSpeed.bottom,
  };

  // Update the cycle interval
  autoCycleInterval.value = Math.round(newSpeed.cycleInterval);

  // Continue updating until animation is complete
  if (progress < 1) {
    requestAnimationFrame(updateAnimationSpeed);
  } else {
    // Animation complete - stop the auto-cycle
    stopAutoCycle();
  }
}

function nextWord() {
  previousWord.value = currentWord.value;
  currentWordIndex.value = (currentWordIndex.value + 1) % shuffledWords.value.length;
  currentWord.value = shuffledWords.value[currentWordIndex.value];

  // Trigger flip animation
  nextTick(() => {
    const element = flipTextElement.value;
    if (element) {
      element.classList.remove('flip');
      void element.offsetWidth; // Force reflow
      element.classList.add('flip');

      // Play sound at halfway point of the animation
      const animationDuration = Math.max(currentAnimationSpeed.value.top, currentAnimationSpeed.value.bottom) * 1000; // Convert to milliseconds
      const halfwayPoint = animationDuration / 2;

      setTimeout(() => {
        // Play the relay switch sound at halfway point
        if (audioElement.value) {
          audioElement.value.currentTime = 0; // Reset to start
          audioElement.value.play().catch((err) => {
            console.warn('Could not play audio:', err);
          });
        }
      }, halfwayPoint);

      // Wait for animation to complete before triggering next cycle
      const totalAnimationTime = Math.max(currentAnimationSpeed.value.top, currentAnimationSpeed.value.bottom) * 1000;
      setTimeout(() => {
        if (isAutoCycling.value) {
          // Schedule next word after animation completes
          autoCycleTimer.value = setTimeout(nextWord, autoCycleInterval.value);
        }
      }, totalAnimationTime);
    }
  });
}

function startAutoCycle() {
  if (!isAutoCycling.value) {
    isAutoCycling.value = true;
    animationStartTime.value = Date.now();
    animationProgress.value = 0;
    currentAnimationSpeed.value = { ...maxSpeed };
    autoCycleInterval.value = maxCycleInterval;

    // Start the animation speed update loop
    updateAnimationSpeed();

    // Start the first cycle immediately
    nextWord();
  }
}

function stopAutoCycle() {
  if (isAutoCycling.value) {
    isAutoCycling.value = false;
    if (autoCycleTimer.value) {
      clearTimeout(autoCycleTimer.value);
      autoCycleTimer.value = null;
    }
    // Reset animation speed
    currentAnimationSpeed.value = { ...maxSpeed };
    animationProgress.value = 0;
    autoCycleInterval.value = maxCycleInterval;

    // Emit the final selected word when animation sequence stops
    emit('wordSelected', currentWord.value);
  }
}

function toggleAutoCycle() {
  if (props.words.length === 0) {
    return;
  }

  if (isAutoCycling.value) {
    stopAutoCycle();
  } else {
    startAutoCycle();
  }
}

// Lifecycle
onMounted(() => {
  // Initialize audio element
  audioElement.value = new Audio('/audio/relay-switch.wav');
  audioElement.value.preload = 'auto';
  audioElement.value.volume = 0.5;
});

// Watch for changes in shuffledWords and initialize/reset words
watch(shuffledWords, (newWords) => {
  currentWordIndex.value = 0;
  // Stop any ongoing auto-cycle when words change
  if (isAutoCycling.value) {
    stopAutoCycle();
  }
  if (newWords.length > 0) {
    // Initialize with first word
    currentWord.value = newWords[0];
    previousWord.value = newWords[newWords.length - 1];
  } else {
    currentWord.value = '';
    previousWord.value = '';
  }
}, { immediate: true });

onUnmounted(() => {
  // Clean up timer when component is destroyed
  stopAutoCycle();
});

defineExpose({
  toggleAutoCycle,
});
</script>

<style scoped>
*,
*::before,
*::after {
  box-sizing: border-box;
  user-select: none;
}

.flip-card {
  font-size: 48px;
  line-height: 0.95;
  padding-bottom: 0.75em; /* keep in sync with line 273; em to be relative to the font-size */
  position: relative;
}

.flip-card__top,
.flip-card__bottom,
.flip-card__back-bottom,
.flip-card__back::before,
.flip-card__back::after {
  backface-visibility: hidden;
  background-color: #222;
  border-radius: 0.15em 0.15em 0 0; /* em to be relative to the font-size */
  color: #ccc;
  display: block;
  font-family: 'Doto', sans-serif;
  height: 0.75em; /* keep in sync with line 258; em to be relative to the font-size */
  overflow: hidden;
  padding: 0.23em 0.25em 0.4em;
  text-align: center;
  text-overflow: ellipsis;
  transform-style: preserve-3d;
  white-space: nowrap;
  width: 100%;
}

.flip-card__top,
.flip-card__bottom,
.flip-card__back-bottom,
.flip-card__back::before,
.flip-card__back::after,
.flip-card__bottom::after,
.flip-card__back-bottom::after {
  font-weight: 700;
}

.flip-card__bottom,
.flip-card__back-bottom {
  background-color: #393939;
  border-radius: 0 0 0.15em 0.15em; /* em to be relative to the font-size */
  border-top: solid 1px #000;
  color: #eee;
  overflow: hidden;
  pointer-events: none;
  position: absolute;
  z-index: 2;
}

.flip-card__back-bottom {
  z-index: 1;
}

.flip-card__bottom::after,
.flip-card__back-bottom::after {
  display: block;
  margin-top: calc(-0.75em - 1px); /* keep in sync with line 258; em to be relative to the font-size */
}

.flip-card__back::before,
.flip-card__bottom::after,
.flip-card__back-bottom::after {
  content: attr(data-value);
}

.flip-card__back {
  position: absolute;
  top: 0;
  height: 100%;
  left: 0%;
  pointer-events: none;
  width: 100%;
}

.flip-card__back::before {
  position: relative;
  overflow: hidden;
  z-index: -1;
}

.flip .flip-card__back::before {
  z-index: 1;
  animation: next-game-flip-text-flipTop v-bind(topAnimationSpeed) cubic-bezier(.37,.01,.94,.35);
  animation-fill-mode: both;
  transform-origin: center bottom;
}

.flip .flip-card__bottom {
  animation: next-game-flip-text-flipBottom v-bind(bottomAnimationSpeed) cubic-bezier(.15,.45,.28,1);
  animation-fill-mode: both;
  transform-origin: center top;
}

@keyframes next-game-flip-text-flipTop {
  0% {
    transform: rotateX(0deg);
    z-index: 2;
  }
  0%, 99% {
    opacity: 1;
  }
  100% {
    transform: rotateX(-90deg);
    opacity: 0;
  }
}

@keyframes next-game-flip-text-flipBottom {
  0%, 50% {
    z-index: -1;
    transform: rotateX(90deg);
    opacity: 0;
  }
  51% {
    opacity: 1;
  }
  100% {
    opacity: 1;
    transform: rotateX(0deg);
    z-index: 5;
  }
}
</style>
