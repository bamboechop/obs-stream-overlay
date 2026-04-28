<template>
  <div
    ref="textWrapper"
    class="max-h-[38px] max-w-[600px] overflow-hidden">
    <span
      ref="textElement"
      class="text-white block font-geist-mono text-base font-black leading-[19px] max-w-full word-wrap-break-word"
      :class="{
        'animate-[message-content-scroll-up_20s_linear_infinite] will-change-transform': shouldMarquee,
      }"
      :style="shouldMarquee ? { '--scroll-distance': `-${scrollDistance}px` } : {}">
      <template
        v-for="(part, index) of messageParts"
        :key="`message-${part.value}-part-${index}`">
        <template v-if="part.type === 'text'">
          {{ part.value }}
        </template>
        <template v-if="part.type === 'emote'">
          <img
            :alt="part.raw"
            class="max-h-5 max-w-5 inline-block"
            :class="{ invert: msgId === 'highlighted-message' }"
            :src="part.value" />
        </template>
      </template>
    </span>
  </div>
</template>

<script lang="ts" setup>
import { nextTick, onMounted, ref, useTemplateRef } from 'vue';
import { parseMessage } from '@/common/helpers/twitch-message.helper';

const props = defineProps<{
  emotes?: { [emoteid: string]: string[] };
  msgId?: 'gigantified-emote-message' | 'highlighted-message';
  msgType: 'chat' | 'action';
  text: string;
  userId: string;
}>();

const textWrapper = useTemplateRef('textWrapper');
const textElement = useTemplateRef('textElement');

const shouldMarquee = ref<boolean>(false);
const scrollDistance = ref<number>(0);
const messageParts = ref<Record<string, string | undefined>[]>([]);

const isGigantifiedEmoteMessage = props.msgType === 'chat' && 'msgId' in props && props.msgId === 'gigantified-emote-message';

// Threshold to account for sub-pixel rendering differences between scrollHeight and clientHeight
const THRESHOLD = 2;

onMounted(async () => {
  messageParts.value = parseMessage(props.emotes, props.text, 'dark', isGigantifiedEmoteMessage ? '3.0' : '2.0');

  await nextTick();
  if (textElement.value && textWrapper.value) {
    const contentHeight = textElement.value.scrollHeight;
    const visibleHeight = textWrapper.value.clientHeight;
    const hasOverflow = contentHeight > visibleHeight + THRESHOLD;
    shouldMarquee.value = hasOverflow;
    if (hasOverflow) {
      scrollDistance.value = contentHeight - visibleHeight + 19; // add additional 19px to account for the line height of the text, 900 font-weight needs more space
    }
  }
});
</script>

<style scoped>
.word-wrap-break-word {
  word-wrap: break-word;
}
</style>

<style>
@keyframes message-content-scroll-up {
  0% {
    transform: translateY(0);
  }
  25% {
    transform: translateY(0);
  }
  75% {
    transform: translateY(var(--scroll-distance, 0));
  }
  100% {
    transform: translateY(var(--scroll-distance, 0));
  }
}
</style>
