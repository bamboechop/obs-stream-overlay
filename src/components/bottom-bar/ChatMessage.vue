<template>
  <li
    class="chat-message rounded-t-lg border border-b-0 bottom-0 max-w-[656px] max-h-full min-w-fit pt-[5px] absolute right-0 transition-transform duration-400 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] w-max after:bg-[rgba(17,17,17,.7)] after:rounded-t-lg after:bottom-0 after:content-[''] after:left-0 after:absolute after:right-0 after:top-0 after:-z-1"
    :class="{
      invert: isHighlightedMessage,
    }"
    :style="{ transform: transformStyle }">
    <img
      alt=""
      class="bottom-0 left-[-16px] absolute aspect-square h-16 w-16 transition-opacity duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1.0)]"
      :class="{ invert: isHighlightedMessage }"
      :src="userImage"
      :style="{ opacity: imageLoaded ? 1 : 0 }"
      @error="handleUserImageError" />
    <div
      class="pl-[52px] pr-1 w-full"
      :class="{ 'pb-[5px]': !$slots.content }">
      <slot name="header"></slot>
      <slot name="content"></slot>
    </div>
    <img
      v-if="messageParts.at(-1)?.type === 'emote' && isGigantifiedEmoteMessage"
      :alt="messageParts.at(-1)!.raw"
      class="left-1/2 max-h-16 max-w-16 absolute -top-16 -translate-x-1/2"
      :src="messageParts.at(-1)!.value" />
  </li>
</template>

<script lang="ts" setup>
import type { IAction, IChat } from '@/common/interfaces/index.interface';
import { computed, nextTick, onMounted, ref } from 'vue';
import { getVersionedToastereiAvatarUrl, preloadImage } from '@/common/helpers/common.helper';
import { hexToRgb, parseMessage } from '@/common/helpers/twitch-message.helper';

const props = defineProps<(IAction | IChat) & { messageIndex?: number; messageOffset?: number }>();

const TOASTEREI_BASE_URL = import.meta.env.VITE_DIE_TOASTEREI_BASE_URL;

const messageParts = ref<Record<string, string | undefined>[]>([]);
const mounted = ref(false);
const userImage = ref<string>('');
const imageLoaded = ref(false);

const defaultAvatarUrl = `${TOASTEREI_BASE_URL}/avatars/default.png`;

const isHighlightedMessage = computed(() => {
  return 'msgId' in props && props.msgId === 'highlighted-message';
});

const isGigantifiedEmoteMessage = props.msgType === 'chat' && 'msgId' in props && props.msgId === 'gigantified-emote-message';

const isActionOrChatMessage = computed(() => ['action', 'chat'].includes(props.msgType));

const messageBackgroundColor = computed(() => {
  if (isActionOrChatMessage.value && props.color) {
    const rgb = hexToRgb(props.color);
    if (rgb) {
      return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.3)`;
    }
  }
  return 'rgba(0,0,0,0.3)';
});

const messageBorderColor = computed(() => {
  if (isActionOrChatMessage.value && props.color) {
    const rgb = hexToRgb(props.color);
    if (rgb) {
      return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.45)`;
    }
  }
  return 'rgba(0,0,0,0.45)';
});

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

function handleUserImageError() {
  // Safety net: if image fails to load in template (shouldn't happen after preload, but edge cases exist)
  userImage.value = defaultAvatarUrl;
  imageLoaded.value = true; // Show default image immediately on error
}

onMounted(async () => {
  // Parse message parts first (needed for gigantified emote check)
  if (props.msgType === 'chat') {
    messageParts.value = parseMessage(props.emotes, props.text, 'dark', isGigantifiedEmoteMessage ? '3.0' : '2.0');
  }

  // Start preload in parallel (don't await) - animation will start immediately
  (async () => {
    try {
      userImage.value = await getVersionedToastereiAvatarUrl(TOASTEREI_BASE_URL, props.userId) ?? defaultAvatarUrl;
      await preloadImage(userImage.value);
      // Image is ready, fade it in
      imageLoaded.value = true;
    } catch {
      // If avatar fails to load, fall back to default and preload it
      try {
        await preloadImage(defaultAvatarUrl);
        userImage.value = defaultAvatarUrl;
        imageLoaded.value = true;
      } catch {
        // If default also fails, set it anyway and show it
        userImage.value = defaultAvatarUrl;
        imageLoaded.value = true;
      }
    }
  })();

  // Preload gigantified emote if applicable (also in parallel)
  if (isGigantifiedEmoteMessage && messageParts.value.at(-1)?.type === 'emote') {
    const emoteUrl = messageParts.value.at(-1)!.value;
    if (emoteUrl) {
      preloadImage(emoteUrl).catch(() => {
        // Silently fail - emote will still try to load in the template
      });
    }
  }

  // Start animation immediately after nextTick (in sync with other messages)
  await nextTick();
  mounted.value = true;
});
</script>

<style scoped>
.chat-message {
  background-color: v-bind(messageBackgroundColor);
  border-color: v-bind(messageBorderColor);
}
</style>
