import type { IEventStreamChannelUpdateData } from '@/common/interfaces/event-stream.interface';
import { storeToRefs } from 'pinia';
import { onBeforeUnmount, onMounted } from 'vue';
import { useTwitchStore } from '@/stores/twitch.store';
import { useEventStreamComposable } from './event-stream.composable';
import { useTwitchChat } from './twitch-chat.composable';

function areChannelsEqual(a: string[], b: string[]) {
  if (a.length !== b.length) {
    return false;
  }
  return a.every(channelA => b.includes(channelA));
}

export function useTwitchStreamInfoComposable(initializeChat = false) {
  const { initChat } = useTwitchChat();

  const twitchStore = useTwitchStore();
  const { category, streamTogetherChannels } = storeToRefs(twitchStore);
  const { getChannelInformation, processStreamTogetherChannels } = twitchStore;
  const { on } = useEventStreamComposable();
  let retryTimeout: ReturnType<typeof setTimeout> | null = null;
  let retryCount = 0;

  function scheduleRetry() {
    if (retryTimeout || retryCount >= 3) {
      return;
    }
    retryCount += 1;
    retryTimeout = setTimeout(() => {
      retryTimeout = null;
      void syncChannelInformation();
    }, 3000);
  }

  async function syncChannelInformation() {
    try {
      const data = await getChannelInformation();
      retryCount = 0;

      if (initializeChat && data?.title) {
        const previousStreamTogetherChannels = [...streamTogetherChannels.value];
        await processStreamTogetherChannels(data.title);
        if (!areChannelsEqual(previousStreamTogetherChannels, streamTogetherChannels.value)) {
          await initChat();
        }
      }
    } catch (err) {
      console.error('Failed to get channel information:', err);
      scheduleRetry();
    }
  }

  onMounted(async () => {
    on<IEventStreamChannelUpdateData>('channel.update', async (data) => {
      if (data.category_name) {
        category.value = data.category_name;
      }

      if (initializeChat) {
        const previousStreamTogetherChannels = [...streamTogetherChannels.value];
        try {
          await processStreamTogetherChannels(data.title);
          if (!areChannelsEqual(previousStreamTogetherChannels, streamTogetherChannels.value)) {
            await initChat();
          }
        } catch (err) {
          console.error('Failed to update stream together channels:', err);
        }
      }
    });

    await syncChannelInformation();
  });

  onBeforeUnmount(() => {
    if (retryTimeout) {
      clearTimeout(retryTimeout);
      retryTimeout = null;
    }
  });
}
