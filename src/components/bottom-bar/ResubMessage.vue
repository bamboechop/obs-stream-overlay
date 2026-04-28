<template>
  <li
    class="bg-[rgba(255,172,18,0.05)] border border-[#ffac12] border-b-0 rounded-t-lg bottom-0 text-white font-geist-mono font-semibold max-w-[656px] max-h-full min-w-fit pt-[5px] absolute right-0 transition-transform duration-400 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] w-max after:bg-[rgba(17,17,17,.7)] after:rounded-t-lg after:bottom-0 after:content-[''] after:left-0 after:absolute after:right-0 after:top-0 after:-z-1"
    :style="{ transform: transformStyle }">
    <img
      alt=""
      class="aspect-square bottom-0 h-16 -left-4 absolute w-16"
      src="/toastys/resub-bot.png" />
    <div class="pl-[52px] pr-1 w-full">
      <strong class="resub-message-name">{{ displayName }}</strong>
      <template v-if="userName && displayName?.toLowerCase() !== userName.toLowerCase()">
        <span class="text-xs"> ({{ userName }})</span>
      </template>
      pflegt seit {{ cumulativeMonths ? cumulativeMonths : months }} Monaten den Garten!
      <img
        :alt="COZY_EMOTE?.name"
        class="max-h-5 max-w-5 inline-block"
        :src="COZY_EMOTE?.url" />
      <div class="resub-message__text">
        <template
          v-for="(part, index) of messageParts"
          :key="`resub-${part.value}-part-${index}`">
          <template v-if="part.type === 'text'">
            {{ part.value }}
          </template>
          <template v-if="part.type === 'emote'">
            <img
              :alt="part.raw"
              class="max-h-5 max-w-5 inline-block"
              :src="part.value" />
          </template>
        </template>
      </div>
    </div>
  </li>
</template>

<script lang="ts" setup>
import type { IResub } from '@/common/interfaces/index.interface';
import { computed, onMounted, ref } from 'vue';
import { EMOTES } from '@/common/constants/emotes.constant';
import { parseMessage } from '@/common/helpers/twitch-message.helper';

const props = defineProps<IResub & { messageIndex?: number; messageOffset?: number }>();

const messageParts = ref<Record<string, string | undefined>[]>([]);
const mounted = ref(false);

const COZY_EMOTE = EMOTES.find(emote => emote.name === 'bamboe1Cozy');

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

  messageParts.value = parseMessage(props.emotes, props.text);
});
</script>

<style scoped>
.resub-message-name {
  color: v-bind(color);
}
</style>
