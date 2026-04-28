<template>
  <div ref="chatContainer">
    <ul class="h-full list-none m-0 p-0 relative">
      <template
        v-for="(message, index) of messages"
        :key="message.id">
        <ChatMessage
          v-if="message.msgType === 'action' || message.msgType === 'chat'"
          :ref="(el) => messageRefs[index] = el as ComponentPublicInstance<typeof ChatMessage>"
          v-bind="message"
          :color="message.color ?? '#007896'"
          :message-index="index"
          :message-offset="getMessageOffset(index)">
          <template #header>
            <MessageHeader
              :available-badges="message.availableBadges"
              :color="message.color ?? '#007896'"
              :display-name="message.displayName"
              :msg-type="message.msgType"
              :user-badges="message.userBadges"
              :user-name="message.userName" />
          </template>
          <template #content>
            <MessageContent
              :emotes="message.emotes"
              :msg-id="'msgId' in message ? message.msgId : undefined"
              :msg-type="message.msgType"
              :text="message.text"
              :user-id="message.userId" />
          </template>
        </ChatMessage>
        <RaidMessage
          v-if="message.msgType === 'raid'"
          :ref="(el) => messageRefs[index] = el as ComponentPublicInstance<typeof RaidMessage>"
          v-bind="message"
          :message-index="index"
          :message-offset="getMessageOffset(index)" />
        <ResubMessage
          v-if="message.msgType === 'resub'"
          :ref="(el) => messageRefs[index] = el as ComponentPublicInstance<typeof ResubMessage>"
          v-bind="message"
          :message-index="index"
          :message-offset="getMessageOffset(index)" />
        <SubMessage
          v-if="message.msgType === 'subscription'"
          :ref="(el) => messageRefs[index] = el as ComponentPublicInstance<typeof SubMessage>"
          v-bind="message"
          :message-index="index"
          :message-offset="getMessageOffset(index)" />
        <SubgiftMessage
          v-if="message.msgType === 'subgift'"
          :ref="(el) => messageRefs[index] = el as ComponentPublicInstance<typeof SubgiftMessage>"
          v-bind="message"
          :message-index="index"
          :message-offset="getMessageOffset(index)" />
      </template>
    </ul>
    <audio
      ref="chatNotificationAudio"
      style="display: none;"></audio>
  </div>
</template>

<script lang="ts" setup>
import type { ComponentPublicInstance } from 'vue';
import type { IChat } from '@/common/interfaces/index.interface';
import type { TMessage } from '@/common/types/index.type';
import { useMediaControls } from '@vueuse/core';
import { storeToRefs } from 'pinia';
import { nextTick, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue';
import { PRIMARY_BOT_ACCOUNT_USERNAME } from '@/common/constants/bot-accounts.constant';
import ChatMessage from '@/components/bottom-bar/ChatMessage.vue';
import MessageContent from '@/components/bottom-bar/message-parts/MessageContent.vue';
import MessageHeader from '@/components/bottom-bar/message-parts/MessageHeader.vue';
import RaidMessage from '@/components/bottom-bar/RaidMessage.vue';
import { broadcasterInfo } from '@/composables/twitch-chat.composable';
import { useTwitchStore } from '@/stores/twitch.store';
import ResubMessage from './ResubMessage.vue';
import SubgiftMessage from './SubgiftMessage.vue';
import SubMessage from './SubMessage.vue';

const store = useTwitchStore();
const { messages } = storeToRefs(store);

const messageRefs = ref<ComponentPublicInstance<typeof ChatMessage | typeof RaidMessage | typeof ResubMessage | typeof SubMessage | typeof SubgiftMessage>[]>([]);
const messageWidths = ref<number[]>([]);
const chatContainer = useTemplateRef('chatContainer');

// Track when messages are displayed (keyed by message ID)
const messageDisplayTimes = ref<Map<string, number>>(new Map());
// Track when messages started sliding out (keyed by message ID)
const messageSlideOutStartTimes = ref<Map<string, number>>(new Map());
// Track slide-out offsets for messages that have crossed the 1-minute threshold
const messageSlideOutOffsets = ref<Map<string, number>>(new Map());
const MESSAGE_LIFETIME_MS = 60 * 1000; // 1 minute
const SLIDE_OUT_ANIMATION_DURATION_MS = 400; // Match CSS transition duration

const chatNotificationAudio = ref<HTMLAudioElement | null>(null);
const isSoundPlaying = ref(false);
const shouldPlaySoundOnNextMessage = ref(false);
let silenceTimeout: number | null = null;

const { currentTime, playing, volume } = useMediaControls(chatNotificationAudio, {
  src: '/audio/chat-notification.mp3',
});

function getBaseMessageOffset(index: number): number {
  let offset = 0;
  const totalMessages = messages.value.length;
  for (let i = index + 1; i < totalMessages; i++) {
    offset += (messageWidths.value[i] || 0) + 4; // 4px gap
  }
  return offset;
}

function getMessageOffset(index: number): number {
  let offset = getBaseMessageOffset(index);

  // Add slide-out offset for messages that have crossed the 1-minute threshold
  const message = messages.value[index];
  if (message && 'id' in message && message.id) {
    const slideOutOffset = messageSlideOutOffsets.value.get(message.id);
    if (slideOutOffset !== undefined) {
      offset += slideOutOffset;
    }
  }

  return offset;
}

async function calculateMessageWidths() {
  await nextTick();
  const newWidths: number[] = [];
  messageRefs.value.forEach((messageRef, index) => {
    if (!messageRef?.$el) {
      // can trigger when a message is deleted on Twitch
      newWidths[index] = 0;
      return;
    }
    const measuredWidth = messageRef.$el.getBoundingClientRect().width;
    newWidths[index] = measuredWidth + 16; // 16px for avatar overflow
  });
  messageWidths.value = newWidths;
}

const SECURITY_OFFSET = 600;

function removeOffscreenMessages() {
  if (!chatContainer.value) {
    return;
  }

  const containerWidth = chatContainer.value.getBoundingClientRect().width;
  const messagesToRemove: string[] = [];

  // Iterate through messages from oldest (index 0) to newest
  for (let i = 0; i < messages.value.length; i++) {
    const message = messages.value[i];

    if (!('id' in message) || !message.id) {
      continue;
    }

    const messageWidth = messageWidths.value[i];
    if (!messageWidth || messageWidth === 0) {
      continue;
    }

    const messageRef = messageRefs.value[i];
    if (!messageRef?.$el) {
      continue;
    }

    // Check if message has started sliding out
    const slideOutStartTime = messageSlideOutStartTimes.value.get(message.id);
    if (slideOutStartTime) {
      // Message is sliding out - wait for animation to complete before removing
      // The message will naturally take SLIDE_OUT_ANIMATION_DURATION_MS to reach the offscreen position
      const slideOutDuration = Date.now() - slideOutStartTime;
      if (slideOutDuration >= SLIDE_OUT_ANIMATION_DURATION_MS) {
        messagesToRemove.push(message.id);
      }
    } else {
      // Check if message has naturally slid off-screen (not via slide-out animation)
      // Use base offset (without slide-out) to check natural overflow
      // Message's left edge position: containerWidth - offset - messageWidth
      // Remove if: offset + messageWidth > containerWidth + SECURITY_OFFSET
      const baseOffset = getBaseMessageOffset(i);
      if (baseOffset + messageWidth > containerWidth + SECURITY_OFFSET) {
        // Check if message is at or past 1 minute - if so, trigger slide-out instead
        const displayTime = messageDisplayTimes.value.get(message.id);
        if (displayTime) {
          const age = Date.now() - displayTime;
          if (age >= MESSAGE_LIFETIME_MS) {
            // Message should slide out, not be removed immediately
            // Trigger slide-out by adding it to slide-out tracking
            if (!messageSlideOutStartTimes.value.has(message.id)) {
              messageSlideOutStartTimes.value.set(message.id, Date.now());
            }
            // Calculate and store slide-out offset if not already set
            if (!messageSlideOutOffsets.value.has(message.id)) {
              const slideOutOffset = containerWidth + SECURITY_OFFSET + 100; // 100px buffer
              messageSlideOutOffsets.value.set(message.id, slideOutOffset);
            }
            // Don't remove yet - let it slide out
            continue;
          }
        }
        // Message is naturally off-screen and not old enough to slide out
        messagesToRemove.push(message.id);
      }
    }
  }

  // Remove messages that are off-screen
  messagesToRemove.forEach((id) => {
    store.removeMessageByMessageId(id);
    // Clean up tracking maps
    messageDisplayTimes.value.delete(id);
    messageSlideOutStartTimes.value.delete(id);
    messageSlideOutOffsets.value.delete(id);
  });
}

function shouldPlayNotificationSound(message: IChat) {
  return message.msgType === 'chat' && ![broadcasterInfo.name.toLowerCase(), PRIMARY_BOT_ACCOUNT_USERNAME.toLowerCase()].includes(message.userName?.toLowerCase() ?? '');
}

function startSilenceDetection() {
  if (silenceTimeout) {
    clearTimeout(silenceTimeout);
  }

  shouldPlaySoundOnNextMessage.value = false;

  silenceTimeout = setTimeout(() => {
    shouldPlaySoundOnNextMessage.value = true;
  }, 5 * 60 * 1000);
}

function playNotificationSound() {
  if (!shouldPlaySoundOnNextMessage.value || isSoundPlaying.value) {
    return;
  }

  isSoundPlaying.value = true;

  try {
    currentTime.value = 0;
    playing.value = true;

    shouldPlaySoundOnNextMessage.value = false;

    startSilenceDetection();
  } catch (error) {
    console.warn('Error playing chat notification sound:', error);
  } finally {
    isSoundPlaying.value = false;
  }
}

function trackMessageDisplayTime(message: TMessage) {
  if (!('id' in message) || !message.id) {
    return;
  }

  // Only track if not already tracked (to preserve original timestamp)
  if (!messageDisplayTimes.value.has(message.id)) {
    // Use message timestamp if available, otherwise use current time
    const displayTime = message.timestamp ?? Date.now();
    messageDisplayTimes.value.set(message.id, displayTime);
  }
}

// Clean up display times for removed messages
function cleanupDisplayTimes() {
  const currentMessageIds = new Set(
    messages.value
      .filter((msg): msg is typeof msg & { id: string } => 'id' in msg && !!msg.id)
      .map(msg => msg.id),
  );

  // Remove display times, slide-out start times, and slide-out offsets for messages that no longer exist
  messageDisplayTimes.value.forEach((_, id) => {
    if (!currentMessageIds.has(id)) {
      messageDisplayTimes.value.delete(id);
      messageSlideOutStartTimes.value.delete(id);
      messageSlideOutOffsets.value.delete(id);
    }
  });
}

let slideOutInterval: number | null = null;

onMounted(async () => {
  volume.value = 0.25;
  startSilenceDetection();
  await calculateMessageWidths();
  removeOffscreenMessages();

  // Set up interval to check for messages that need to slide out
  // Only update offsets for messages that cross the 1-minute threshold
  slideOutInterval = window.setInterval(() => {
    const now = Date.now();

    // Check each message to see if it has crossed the 1-minute threshold
    messages.value.forEach((message) => {
      if (!('id' in message) || !message.id) {
        return;
      }

      const displayTime = messageDisplayTimes.value.get(message.id);
      if (!displayTime) {
        return;
      }

      const age = now - displayTime;

      // If message has crossed the threshold and isn't already sliding out
      if (age >= MESSAGE_LIFETIME_MS && !messageSlideOutOffsets.value.has(message.id)) {
        // Track when slide-out started (only once)
        if (!messageSlideOutStartTimes.value.has(message.id)) {
          messageSlideOutStartTimes.value.set(message.id, now);
        }

        // Calculate and store slide-out offset
        if (chatContainer.value) {
          const containerWidth = chatContainer.value.getBoundingClientRect().width;
          const slideOutOffset = containerWidth + SECURITY_OFFSET + 100; // 100px buffer
          messageSlideOutOffsets.value.set(message.id, slideOutOffset);
        }
      }
    });

    // Recalculate widths and remove offscreen messages
    if (chatContainer.value) {
      calculateMessageWidths();
      removeOffscreenMessages();
    }
  }, 1000); // Check every second
});

onUnmounted(() => {
  if (slideOutInterval !== null) {
    clearInterval(slideOutInterval);
  }
});

watch(messages, async () => {
  const message = messages.value.at(-1);
  if (!message) {
    return;
  }
  trackMessageDisplayTime(message);

  // Clean up display times for removed messages
  cleanupDisplayTimes();

  await calculateMessageWidths();
  removeOffscreenMessages();

  if (message && shouldPlayNotificationSound(message as IChat)) {
    if (shouldPlaySoundOnNextMessage.value) {
      playNotificationSound();
    } else {
      startSilenceDetection();
    }
  }
}, { deep: true });
</script>
