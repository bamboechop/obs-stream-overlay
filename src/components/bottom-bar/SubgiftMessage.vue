<template>
  <li
    class="bg-[rgba(255,117,18,0.075)] border border-[#ff7512] border-b-0 rounded-t-lg bottom-0 text-white font-geist-mono font-semibold max-w-[656px] max-h-full min-w-fit pt-[5px] absolute right-0 transition-transform duration-400 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] w-max after:bg-[rgba(17,17,17,.7)] after:rounded-t-lg after:bottom-0 after:content-[''] after:left-0 after:absolute after:right-0 after:top-0 after:-z-1"
    :style="{ transform: transformStyle }">
    <img
      alt=""
      class="aspect-square bottom-0 h-16 -left-4 absolute w-16"
      src="/toastys/subgift-bot.png" />
    <div class="pl-[52px] pr-1 w-full">
      <strong :style="{ color: '#ff7512' }">{{ sender.displayName }}</strong>
      <template v-if="sender.userName && sender.displayName?.toLowerCase() !== sender.userName.toLowerCase()">
        <span class="text-xs"> ({{ sender.userName }})</span>
      </template>
      hat im Garten einen Platz für
      <strong :style="{ color: '#ffdf12' }">{{ recipient.displayName }}</strong>
      <template v-if="recipient.userName && recipient.displayName?.toLowerCase() !== recipient.userName.toLowerCase()">
        <span class="text-xs"> ({{ recipient.userName }})</span>
      </template>
      vorbereitet. Vielen Dank.
      <img
        :alt="COZY_EMOTE?.name"
        class="max-h-5 max-w-5 inline-block"
        :src="COZY_EMOTE?.url" />
    </div>
  </li>
</template>

<script lang="ts" setup>
import type { ISubGift } from '@/common/interfaces/index.interface';
import { computed, onMounted, ref } from 'vue';
import { EMOTES } from '@/common/constants/emotes.constant';

const props = defineProps<ISubGift & { messageIndex?: number; messageOffset?: number }>();

const COZY_EMOTE = EMOTES.find(emote => emote.name === 'bamboe1Cozy');

const mounted = ref(false);

const transformStyle = computed(() => {
  if (!mounted.value) {
    // Before mounting, slide in from the right
    return 'translateX(100%)';
  }
  // After mounting, use the offset to position the message
  // The offset is calculated from the right edge, so we move left by that amount
  const offset = props.messageOffset ?? 0;
  return `translateX(-${offset}px)`;
});

onMounted(async () => {
  window.setTimeout(() => {
    mounted.value = true;
  }, 0);
});
</script>
