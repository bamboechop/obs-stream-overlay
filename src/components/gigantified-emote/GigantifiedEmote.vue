<template>
  <template v-if="gigantifiedEmoteQueue.length > 0">
    <img
      class="gigantified-emote"
      :class="{
        'animate-slide-through': isAnimating && !isBlaEmote && !isClapEmote && !isDannerGeblitzt && !isLurkEmote && !isNotedEmote && !isPartyEmote && !isSteerEmote,
        'animate-bla': isAnimating && isBlaEmote,
        'animate-clap': isAnimating && isClapEmote,
        'animate-danner-geblitzt': isAnimating && isDannerGeblitzt,
        'animate-lurk': isAnimating && isLurkEmote,
        'animate-noted': isAnimating && isNotedEmote,
        'animate-party': isAnimating && isPartyEmote,
        'animate-steer': isAnimating && isSteerEmote,
        'gigantified-emote--bla': isBlaEmote,
        'gigantified-emote--clap': isClapEmote,
        'gigantified-emote--danner-geblitzt': isDannerGeblitzt,
        'gigantified-emote--lurk': isLurkEmote,
        'gigantified-emote--noted': isNotedEmote,
        'gigantified-emote--party': isPartyEmote,
        'gigantified-emote--steer': isSteerEmote,
      }"
      :src="gigantifiedEmoteQueue[0].url"
      :alt="gigantifiedEmoteQueue[0].emote"
      @animationend="onAnimationEnd" />
  </template>
  <audio
    ref="audioPlayer"
    preload="auto"></audio>
</template>

<script lang="ts" setup>
import type { IChat } from '@/common/interfaces/index.interface';
import { useMediaControls } from '@vueuse/core';
import { storeToRefs } from 'pinia';
import { computed, onMounted, ref, watch } from 'vue';
import { EMOTES } from '@/common/constants/emotes.constant';
import { parseMessage } from '@/common/helpers/twitch-message.helper';
import { useSearchParamsComposable } from '@/composables/search-params.composable';
import { useTwitchStore } from '@/stores/twitch.store';

const store = useTwitchStore();
const { messages } = storeToRefs(store);

const { gigantifiedEmoteVolume } = useSearchParamsComposable();

const gigantifiedEmoteQueue = ref<{ emote: string; messageId: string; url: string }[]>([]);
const isAnimating = ref(false);
const audioPlayer = ref<HTMLAudioElement>();

const { currentTime, playing, volume } = useMediaControls(audioPlayer, { src: '/audio/woosh.mp3' });

const isBlaEmote = computed(() => gigantifiedEmoteQueue.value[0]?.emote === 'bamboe1Bla');

const isDannerGeblitzt = computed(() => gigantifiedEmoteQueue.value[0]?.emote === 'danner6Geblitzt');

const isClapEmote = computed(() => gigantifiedEmoteQueue.value[0]?.emote === 'bamboe1Clap');

const isLurkEmote = computed(() => gigantifiedEmoteQueue.value[0]?.emote === 'bamboe1Lurk');

const isNotedEmote = computed(() => gigantifiedEmoteQueue.value[0]?.emote === 'bamboe1Noted');

const isPartyEmote = computed(() => gigantifiedEmoteQueue.value[0]?.emote === 'bamboe1Party');

const isSteerEmote = computed(() => gigantifiedEmoteQueue.value[0]?.emote === 'bamboe1Steer');

function getAudioSrc() {
  if (isBlaEmote.value) {
    return '/audio/bla.wav';
  }

  if (isClapEmote.value) {
    return '/audio/clap.mp3';
  }

  if (isDannerGeblitzt.value) {
    return '/audio/geblitzt.wav';
  }

  if (isLurkEmote.value) {
    return '/audio/mission-impossible.mp3';
  }

  if (isNotedEmote.value) {
    return '/audio/noted.wav';
  }

  if (isPartyEmote.value) {
    return '/audio/party.mp3';
  }

  if (isSteerEmote.value) {
    return '/audio/crash.wav';
  }

  return '/audio/woosh.mp3';
}

function startAnimation() {
  audioPlayer.value!.src = getAudioSrc();
  currentTime.value = 0;
  playing.value = true;
  isAnimating.value = true;
}

function onAnimationEnd() {
  isAnimating.value = false;
}

onMounted(() => {
  volume.value = gigantifiedEmoteVolume.value;
});

watch([isAnimating, playing], ([isAnimating, isPlaying]) => {
  if (!isAnimating && !isPlaying && gigantifiedEmoteQueue.value.length > 0) {
    gigantifiedEmoteQueue.value.shift();
  }
});

const currentFirstItem = ref<string | null>(null);
watch(() => gigantifiedEmoteQueue.value[0]?.messageId, (newFirstId, oldFirstId) => {
  if (newFirstId && newFirstId !== oldFirstId) {
    currentFirstItem.value = newFirstId;
    if (currentFirstItem.value === newFirstId
      && !isAnimating.value
      && !playing.value
      && gigantifiedEmoteQueue.value.length > 0) {
      setTimeout(() => {
        startAnimation();
      }, 2000); // delay to ensure the image is loaded
    }
  }
});

let messageId = 0;
watch(messages, () => {
  const newestMessage = (messages.value as IChat[]).at(-1);

  if (newestMessage && newestMessage.msgId === 'gigantified-emote-message') {
    const emotes = parseMessage(newestMessage.emotes, newestMessage.text, 'dark', '3.0').filter(part => part.type === 'emote');
    if (emotes.length > 0) {
      let { raw: emote, value: url } = emotes.at(-1)! as { raw: string; value: string };
      const emoteObject = EMOTES.find(e => e.name === emote);
      if (emoteObject) {
        url = emoteObject.url;
      }
      // Generate unique ID for this emote instance
      const uniqueId = `${newestMessage.msgId}-${++messageId}`;
      if (!gigantifiedEmoteQueue.value.some(item => item.messageId === uniqueId)) {
        gigantifiedEmoteQueue.value.push({ emote, messageId: uniqueId, url });
      }
    }
  }
}, { deep: true, immediate: true });
</script>

<style scoped>
.gigantified-emote {
  position: fixed;
  left: 50%;
  transform: translateX(-50%) translateY(100vh);
  width: 100%;
  z-index: 9999;
  filter: drop-shadow(0 75px 20px rgba(0, 0, 0, 0.75));
}

.gigantified-emote.animate-slide-through {
  animation: slide-up 2.201s ease-in-out forwards;
}

.gigantified-emote.animate-bla {
  animation: bla-animation 6.5s ease-in-out forwards;
}

.gigantified-emote.animate-clap {
  animation: clap-animation 4.5s ease-in-out forwards;
}

.gigantified-emote.animate-danner-geblitzt {
  animation: danner-geblitzt-animation 11s ease-in-out forwards;
}

.gigantified-emote.animate-lurk {
  animation: lurk-animation 3.6s ease-in-out forwards;
}

.gigantified-emote.animate-noted {
  animation: noted-animation 1.9s ease-in-out forwards;
}

.gigantified-emote.animate-party {
  animation: party-animation 8s ease-out forwards;
}

.gigantified-emote.animate-steer {
  animation: steer-animation 3.9s ease-in-out forwards;
}

.gigantified-emote--bla {
  max-height: 900px;
  width: auto;
}

.gigantified-emote--clap {
  max-height: 720px;
  width: auto;
}

.gigantified-emote--danner-geblitzt {
  height: 100vh;
  left: 50%;
  opacity: 0;
  transform: translateX(-50%);
  width: auto;
}

.gigantified-emote--lurk {
  margin: 0 auto;
  max-width: 1920px;
}

.gigantified-emote--noted {
  left: auto;
  max-height: 720px;
  right: 10px;
  transform: translateY(100vh);
  width: auto;
}

.gigantified-emote--party {
  bottom: 0;
  left: 50%;
  max-height: 1080px;
  opacity: 0;
  transform: translateX(-50%);
  transform-origin: bottom center;
  width: auto;
}

.gigantified-emote--steer {
  bottom: 0;
  filter: none;
  left: 0;
  max-height: 1080px;
  opacity: 0;
  transform: none;
  width: auto;
}

@keyframes slide-up {
  0% {
    transform: translateX(-50%) translateY(100vh);
  }
  to {
    transform: translateX(-50%) translateY(-200vh);
  }
}

@keyframes bla-animation {
  /* bottom left */
  0%,
  14.27% {
    transform: translateX(-125%) translateY(55vh);
    scale: 0.8;
  }

  /* top left */
  14.28%,
  28.56% {
    transform: translateX(-225%) translateY(0vh) rotate(90deg);
    scale: 0.7;
  }

  /* bottom right */
  28.57%,
  42.89% {
    transform: translateX(50%) translateY(40vh) rotate(270deg);
    scale: 0.9;
  }

  /* bottom left */
  42.90%,
  57.13% {
    transform: translateX(-100%) translateY(37vw) rotate(0deg);
    scale: 0.75;
  }

  /* bottom left diagonal */
  57.14%,
  71.44% {
    transform: translateX(-100vw) translateY(95vh) rotate(45deg);
    scale: 0.6;
  }

  /* top middle */
  71.45%,
  85.70% {
    transform: translateX(-50%) translateY(-5vh) rotate(180deg);
    scale: 1;
  }

  /* top right diagonal */
  85.71%,
  100% {
    transform: translateX(67%) translateY(-37%) rotate(225deg);
    scale: 0.8;
  }
}

@keyframes clap-animation {
  0% {
    transform: translateX(-50%) translateY(calc(100vh));
    opacity: 0;
  }
  5% {
    transform: translateX(-50%) translateY(calc(100vh - 100%));
    opacity: 1;
  }
  90% {
    transform: translateX(-50%) translateY(calc(100vh - 100%));
    opacity: 1;
  }
  100% {
    transform: translateX(-50%) translateY(calc(100vh + 150px));
    opacity: 1;
  }
}

@keyframes danner-geblitzt-animation {
  0% {
    opacity: 0;
  }

  54.4% {
    opacity: 0;
  }

  54.5% {
    filter: brightness(0) invert(1);
    opacity: 1;
  }

  63.5% {
    filter: brightness(100%) invert(0);
    opacity: 1;
  }

  100% {
    opacity: 1;
  }
}

@keyframes lurk-animation {
  0% {
    transform: translateX(-50%) translateY(calc(100vh));
    opacity: 0;
  }
  10% {
    transform: translateX(-50%) translateY(calc(100vh - 100%));
    opacity: 1;
  }
  90% {
    transform: translateX(-50%) translateY(calc(100vh - 100%));
    opacity: 1;
  }
  100% {
    transform: translateX(-50%) translateY(calc(100vh + 150px));
    opacity: 1;
  }
}

@keyframes noted-animation {
  0% {
    transform: translateY(calc(100vh));
    opacity: 0;
  }
  10% {
    transform: translateY(calc(100vh - 100%));
    opacity: 1;
  }
  90% {
    transform: translateY(calc(100vh - 100%));
    opacity: 1;
  }
  100% {
    transform: translateY(calc(100vh + 150px));
    opacity: 1;
  }
}

@keyframes party-animation {
  0%, 5% {
    transform: translateX(-50%) translateY(0) scale(0.8);
    opacity: 1;
  }

  10% {
    transform: translateX(-80%) translateY(50px) scale(1.1);
    opacity: 1;
  }

  15% {
    transform: translateX(20%) translateY(0) scale(0.5);
    opacity: 1;
  }

  20% {
    transform: translateX(-100%) translateY(30px) scale(0.9);
    opacity: 1;
  }

  25% {
    transform: translateX(-20%) translateY(0) scale(1.0);
    opacity: 1;
  }

  30% {
    transform: translateX(-100%) translateY(40px) scale(0.6);
    opacity: 1;
  }

  35% {
    transform: translateX(50%) translateY(0) scale(1.1);
    opacity: 1;
  }

  40% {
    transform: translateX(-60%) translateY(20px) scale(0.7);
    opacity: 1;
  }

  45% {
    transform: translateX(-90%) translateY(0) scale(1.0);
    opacity: 1;
  }

  50% {
    transform: translateX(-40%) translateY(60px) scale(0.5);
    opacity: 1;
  }

  55% {
    transform: translateX(40%) translateY(0) scale(0.9);
    opacity: 1;
  }

  60% {
    transform: translateX(-120%) translateY(35px) scale(1.1);
    opacity: 1;
  }

  65% {
    transform: translateX(-70%) translateY(0) scale(0.8);
    opacity: 1;
  }

  70% {
    transform: translateX(-80%) translateY(25px) scale(0.6);
    opacity: 1;
  }

  75% {
    transform: translateX(20%) translateY(0) scale(1.0);
    opacity: 1;
  }

  80% {
    transform: translateX(-110%) translateY(45px) scale(0.7);
    opacity: 1;
  }

  85% {
    transform: translateX(50%) translateY(0) scale(1.1);
    opacity: 1;
  }

  90% {
    transform: translateX(-100%) translateY(30px) scale(0.9);
    opacity: 1;
  }

  95% {
    transform: translateX(-85%) translateY(0) scale(0.8);
    opacity: 1;
  }

  100% {
    transform: translateX(-50%) translateY(0) scale(1.0);
    opacity: 1;
  }
}

@keyframes steer-animation {
  0% {
    opacity: 0;
  }

  40%,
  99% {
    opacity: 1;
  }

  100% {
    opacity: 0;
  }
}
</style>
