<template>
  <ul
    ref="listRef"
    class="flex flex-row items-end gap-2.5 list-none m-0 p-0 will-change-transform transition-opacity duration-500 ease-in-out"
    :class="[intermissionVideoPlaying ? 'opacity-0' : 'opacity-100']">
    <li
      v-for="(emote, index) in [...EMOTES, ...EMOTES, ...EMOTES]"
      :key="`${emote.name}-${index}`"
      class="flex flex-col shrink-0 max-w-32 relative">
      <img
        :alt="emote.name"
        class="aspect-square w-full shrink-0"
        :src="emote.url" />
      <template v-if="emote.new">
        <span class="bg-[#c91c1c] text-white font-black text-xs px-2 py-1 absolute right-0 top-0 text-shadow-[0_0_10px_#000] uppercase rotate-30 z-1">New</span>
      </template>
      <template v-if="emote.updated">
        <span class="bg-[#1c53c9] text-white font-black text-xs px-2 py-1 absolute right-0 top-2.5 text-shadow-[0_0_10px_#000] uppercase rotate-30 z-1">Updated</span>
      </template>
      <div class="bg-black text-white flex flex-row gap-1 justify-center p-1 pb-0">
        <template v-if="emote.tier === 'follower'">
          <Heart
            class="text-[#d81515] fill-[#d81515]"
            :size="16" />
        </template>
        <template v-if="emote.tier === '1' || emote.tier === '2' || emote.tier === '3'">
          <Star
            class="text-[#f3d113] fill-[#f3d113]"
            :size="16" />
        </template>
        <template v-if="emote.tier === '2' || emote.tier === '3'">
          <Star
            class="text-[#f3d113] fill-[#f3d113]"
            :size="16" />
        </template>
        <template v-if="emote.tier === '3'">
          <Star
            class="text-[#f3d113] fill-[#f3d113]"
            :size="16" />
        </template>
      </div>
      <span
        class="bg-black text-white text-xs font-semibold tracking-[0.5px] overflow-hidden px-2 py-1 text-center"
        :class="{ 'text-clip': hasMarquee(index) }"
        :style="getMarqueeStyle(index)"
        :ref="(el) => setNameRef(el as HTMLElement | null, index)">
        <span
          class="inline-block min-w-full"
          :class="{ 'animate-[scroll-emote-marquee_var(--marquee-duration,6s)_linear_infinite_alternate] min-w-max text-left will-change-transform': hasMarquee(index) }">{{ emote.name }}</span>
      </span>
    </li>
  </ul>
</template>

<script lang="ts" setup>
import { nextTick, onMounted, onUnmounted, ref } from 'vue';
import { Heart, Star } from 'lucide-vue-next';
import { EMOTES } from '@/common/constants/emotes.constant';
import { useApplicationStore } from '@/stores/application.store';
import { storeToRefs } from 'pinia';

const applicationStore = useApplicationStore();
const { intermissionVideoPlaying } = storeToRefs(applicationStore);

const listRef = ref<HTMLElement>();
const emoteNameRefs = ref<Array<HTMLElement | null>>([]);
const marqueeDistances = ref<Record<number, number>>({});

let animationId: number;
let translateX = 0;
let contentWidth = 0;
const speed = 1;

function setNameRef(el: HTMLElement | null, index: number) {
  emoteNameRefs.value[index] = el;
}

function updateMarqueeState() {
  const nextMarqueeDistances: Record<number, number> = {};

  emoteNameRefs.value.forEach((el, index) => {
    if (!el) {
      return;
    }

    const distance = el.scrollWidth - el.clientWidth;

    if (distance > 0) {
      nextMarqueeDistances[index] = distance;
    }
  });

  marqueeDistances.value = nextMarqueeDistances;
}

function hasMarquee(index: number) {
  return marqueeDistances.value[index] !== undefined;
}

function getMarqueeStyle(index: number) {
  const distance = marqueeDistances.value[index];
  if (!distance) {
    return undefined;
  }

  return {
    '--marquee-distance': `${distance}px`,
    '--marquee-duration': `${Math.max(4, distance / 20).toFixed(2)}s`,
  };
}

function animate() {
  if (!listRef.value) {
    return;
  }

  translateX -= speed;

  // Calculate the width of one complete set of emotes
  if (contentWidth === 0) {
    const children = listRef.value.children;
    const singleSetLength = EMOTES.length;
    let width = 0;

    for (let i = 0; i < singleSetLength; i++) {
      const child = children[i] as HTMLElement;
      if (child) {
        width += child.offsetWidth + 10; // 10px gap
      }
    }
    contentWidth = width;
  }

  // Reset position when we've scrolled exactly one complete set
  // This happens when all of the first set is completely off-screen
  if (Math.abs(translateX) >= contentWidth) {
    translateX = 0;
  }

  listRef.value.style.transform = `translateX(${translateX}px)`;
  animationId = requestAnimationFrame(animate);
}

onMounted(() => {
  animationId = requestAnimationFrame(animate);
  nextTick(() => {
    updateMarqueeState();
    window.addEventListener('resize', updateMarqueeState);
  });
});

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId);
  }

  window.removeEventListener('resize', updateMarqueeState);
});
</script>

<style>
@keyframes scroll-emote-marquee {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(calc(var(--marquee-distance, 0px) * -1));
  }
}
</style>
