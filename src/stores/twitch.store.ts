import type { IEventStreamAdBreakBeginData } from '@/common/interfaces/event-stream.interface';
import type { TMessage } from '@/common/types/index.type';
import { actionDummy } from '@data/action.data';
import { chatDummy } from '@data/chat.data';
import { raidDummy } from '@data/raid.data';
import { resubDummy } from '@data/resub.data';
import { subgiftDummy } from '@data/subgift.data';
import { subscriptionDummy } from '@data/subscription.data';
import { useSessionStorage } from '@vueuse/core';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { getUserIdByUserName } from '@/common/helpers/twitch-message.helper';
import { useEventStreamComposable } from '@/composables/event-stream.composable';
import { RequestCache } from '@/services/request-cache.service';
import { twitchRequest, validateTokenWithTTL } from '@/services/twitch-auth.service';

interface TwitchAdScheduleResponse {
  data: Array<{
    duration: number;
    next_ad_at: number;
  }>;
}

interface TwitchStreamResponse {
  data: Array<{
    viewer_count: number;
  }>;
}

interface ChannelInformationResponse {
  game_name: string;
  title: string;
}

const streamTogetherChannels = ref<string[]>([]);
const streamTogetherChannelIds = ref<{ [channel: string]: string }>({});
let adBreakUnsubscribe: (() => void) | null = null;

export const useTwitchStore = defineStore('Twitch Store', () => {
  const adSchedule = ref<{ duration: number; nextTime: number } | null>(null);
  const category = useSessionStorage<string>('twitch-category', 'Media Player');
  const messages = ref<TMessage[]>([]);
  const viewers = ref(0);
  const isAdRunning = ref(false);
  const adDuration = ref<number>(0);

  const addDebugMessages = () => {
    messages.value.push(resubDummy, subscriptionDummy, subgiftDummy, actionDummy, ...chatDummy, raidDummy);
  };

  const addMessage = (message: TMessage) => {
    messages.value.push(message);
  };

  const clearMessages = (channel: string) => {
    messages.value = messages.value.filter(message => message.channel !== channel);
  };

  const removeMessageByMessageId = (id: string) => {
    messages.value = messages.value.filter((message) => {
      if (!('id' in message)) {
        return message;
      }
      return message.id !== id;
    });
  };

  const removeMessagesByUserId = (userId: string) => {
    messages.value = messages.value.filter((message) => {
      if (!('userId' in message)) {
        return message;
      }
      return message.userId !== userId;
    });
  };

  let adScheduleRetryCount = 0;
  const getAdSchedule = async () => {
    try {
      const data = await twitchRequest<TwitchAdScheduleResponse>(`https://api.twitch.tv/helix/channels/ads?broadcaster_id=${import.meta.env.VITE_TWITCH_BROADCASTER_ID}`, {
        method: 'GET',
      }, 10);

      adScheduleRetryCount = 0;
      const [information] = data.data;
      adSchedule.value = {
        duration: information.duration,
        nextTime: information.next_ad_at * 1000,
      };
    } catch (error) {
      // If another instance recently made this request, silently skip
      if (error instanceof Error && error.message === 'REQUEST_RECENTLY_MADE_BY_OTHER_INSTANCE') {
        return;
      }

      // Handle HTTP errors with retry logic
      adSchedule.value = null;
      if (adScheduleRetryCount < 5) {
        adScheduleRetryCount++;
        window.setTimeout(async () => {
          await getAdSchedule();
        }, 5000); // try again in 5 seconds
      } else if (adScheduleRetryCount === 5) {
        // eslint-disable-next-line no-alert
        window.alert('Ad Schedule fetching failed five times!');
      }
    }
  };

  const processStreamTogetherChannels = async (title: string) => {
    streamTogetherChannels.value = (title?.match(/@\w+/g) || []).map((username: string) => username.substring(1));
    streamTogetherChannelIds.value = {};
    for (const channel of streamTogetherChannels.value) {
      const channelId = await getUserIdByUserName(channel);
      if (channelId) {
        streamTogetherChannelIds.value[channel] = channelId;
      }
    }
  };

  const getChannelInformation = async (): Promise<ChannelInformationResponse | null> => {
    try {
      const data = await RequestCache.request<ChannelInformationResponse>(`${import.meta.env.VITE_BAMBBOT_API_URL}/twitch/channel-information`, {
        method: 'GET',
      }, 10);

      if (data?.game_name) {
        category.value = data.game_name;
      }
      return data ?? null;
    } catch (error) {
      if (error instanceof Error && error.message === 'REQUEST_RECENTLY_MADE_BY_OTHER_INSTANCE') {
        return null;
      }
      throw error;
    }
  };

  const updateViewerCount = async (name: string) => {
    try {
      const data = await twitchRequest<TwitchStreamResponse>(`https://api.twitch.tv/helix/streams?user_login=${name}`, {
        method: 'GET',
      }, 10);

      viewers.value = data.data?.[0]?.viewer_count ?? 0;
    } catch (error) {
      if (error instanceof Error && error.message === 'REQUEST_RECENTLY_MADE_BY_OTHER_INSTANCE') {
        return;
      }
      throw error;
    }
  };

  const initializeAdBreakListener = () => {
    if (adBreakUnsubscribe) {
      return;
    }

    const { on } = useEventStreamComposable();
    adBreakUnsubscribe = on<IEventStreamAdBreakBeginData>('channel.ad_break.begin', (data) => {
      isAdRunning.value = true;
      adDuration.value = data.duration_seconds;

      // Set timeout to mark ad as finished after duration
      window.setTimeout(() => {
        isAdRunning.value = false;
        adDuration.value = 0;
      }, data.duration_seconds * 1000);
    });
  };

  // Reset ad state when stream goes offline
  const resetAdState = () => {
    isAdRunning.value = false;
    adDuration.value = 0;
  };

  const validateToken = async () => {
    try {
      const isValid = await validateTokenWithTTL(1000 * 60 * 45);
      if (!isValid) {
        const error = new Error('Twitch token invalid');
        (error as { code?: string }).code = 'ERR_BAD_REQUEST';
        throw error;
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'REQUEST_RECENTLY_MADE_BY_OTHER_INSTANCE') {
        return;
      }
      throw error;
    }
  };

  return {
    adDuration,
    adSchedule,
    category,
    isAdRunning,
    messages,
    streamTogetherChannels,
    streamTogetherChannelIds,
    viewers,
    addMessage,
    addDebugMessages,
    clearMessages,
    getAdSchedule,
    getChannelInformation,
    initializeAdBreakListener,
    processStreamTogetherChannels,
    removeMessageByMessageId,
    removeMessagesByUserId,
    resetAdState,
    updateViewerCount,
    validateToken,
  };
}, {
  share: {
    enable: false,
  },
});
