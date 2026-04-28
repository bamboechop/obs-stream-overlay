import type {
  IEventStreamAdBreakBeginData,
  IEventStreamChannelPointsAutomaticRewardRedemptionAddData,
  IEventStreamChannelUpdateData,
  IEventStreamToastereiChannelPointsShowData,
  IEventStreamToastereiWheelSharedSpinData,
  TwitchEventSubNotificationChannelPollBeginEventDto,
  TwitchEventSubNotificationChannelPollEndEventDto,
  TwitchEventSubNotificationChannelPollProgressEventDto,
  TwitchEventSubNotificationGameDeathToggleDto,
  TwitchEventSubNotificationGameDeathUpdateDto,
} from '@/common/interfaces/event-stream.interface';
import { onBeforeUnmount, onMounted, ref } from 'vue';

const eventBus = new EventTarget();
let eventSource: EventSource | null = null;
const eventListeners = new Map<string, (event: MessageEvent) => void>();
let isSetupComplete = false;
let reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
const isConnecting = ref(false);
const reconnectDelay = 5000;
const maxReconnectAttempts = 5;
let reconnectAttempts = 0;

export function useEventStreamComposable() {
  function removeAllEventSourceListeners() {
    if (!eventSource) {
      return;
    }
    eventListeners.forEach((handler, eventName) => {
      eventSource?.removeEventListener(eventName, handler);
    });
    eventListeners.clear();
  }

  function addEventSourceListener(eventName: string, handler: (event: MessageEvent) => void) {
    if (!eventSource || eventListeners.has(eventName)) {
      return;
    }
    eventSource.addEventListener(eventName, handler);
    eventListeners.set(eventName, handler);
  }

  function scheduleReconnect() {
    if (reconnectTimeoutId) {
      clearTimeout(reconnectTimeoutId);
    }
    isConnecting.value = false;

    if (reconnectAttempts >= maxReconnectAttempts) {
      // eslint-disable-next-line no-alert
      window.alert('Connection to the event stream failed five times!');
      reconnectAttempts = 0;
      return;
    }

    reconnectTimeoutId = setTimeout(() => {
      reconnectTimeoutId = null;
      eventSourceSetup();
    }, reconnectDelay);
  }

  function eventSourceSetup() {
    if ((eventSource && eventSource.readyState !== EventSource.CLOSED) || isConnecting.value || reconnectTimeoutId) {
      return;
    }

    isConnecting.value = true;

    removeAllEventSourceListeners();
    eventSource?.close();

    try {
      eventSource = new EventSource(`${import.meta.env.VITE_BAMBBOT_API_URL}/twitch/eventstream`);
      isConnecting.value = false;

      addEventSourceListener('channel.update', (event) => {
        const detail = JSON.parse(event.data) as IEventStreamChannelUpdateData;
        eventBus.dispatchEvent(new CustomEvent('channel.update', { detail }));
      });

      addEventSourceListener('channel.ad_break.begin', (event) => {
        const detail = JSON.parse(event.data) as IEventStreamAdBreakBeginData;
        eventBus.dispatchEvent(new CustomEvent('channel.ad_break.begin', { detail }));
      });

      addEventSourceListener('channel.channel_points_automatic_reward_redemption.add', (event) => {
        const detail = JSON.parse(event.data) as IEventStreamChannelPointsAutomaticRewardRedemptionAddData;
        eventBus.dispatchEvent(new CustomEvent('channel.channel_points_automatic_reward_redemption.add', { detail }));
      });

      addEventSourceListener('channel.poll.begin', (event) => {
        const detail = JSON.parse(event.data) as TwitchEventSubNotificationChannelPollBeginEventDto;
        eventBus.dispatchEvent(new CustomEvent('channel.poll.begin', { detail }));
      });

      addEventSourceListener('channel.poll.progress', (event) => {
        const detail = JSON.parse(event.data) as TwitchEventSubNotificationChannelPollProgressEventDto;
        eventBus.dispatchEvent(new CustomEvent('channel.poll.progress', { detail }));
      });

      addEventSourceListener('channel.poll.end', (event) => {
        const detail = JSON.parse(event.data) as TwitchEventSubNotificationChannelPollEndEventDto;
        if (detail.status === 'archived') {
          return; // ignore archived polls as this fires after completed or terminated events came in already
        }
        eventBus.dispatchEvent(new CustomEvent('channel.poll.end', { detail }));
      });

      addEventSourceListener('game.death.toggle', (event) => {
        const detail = JSON.parse(event.data) as TwitchEventSubNotificationGameDeathToggleDto;
        eventBus.dispatchEvent(new CustomEvent('game.death.toggle', { detail }));
      });

      addEventSourceListener('game.death.update', (event) => {
        const detail = JSON.parse(event.data) as TwitchEventSubNotificationGameDeathUpdateDto;
        eventBus.dispatchEvent(new CustomEvent('game.death.update', { detail }));
      });

      addEventSourceListener('overlay.roll.category', () => {
        eventBus.dispatchEvent(new CustomEvent('overlay.roll.category'));
      });

      addEventSourceListener('overlay.roll.game', () => {
        eventBus.dispatchEvent(new CustomEvent('overlay.roll.game'));
      });

      addEventSourceListener('overlay.timer.add', (event) => {
        const detail = JSON.parse(event.data) as number;
        eventBus.dispatchEvent(new CustomEvent('overlay.timer.add', { detail }));
      });

      addEventSourceListener('overlay.timer.pause', () => {
        eventBus.dispatchEvent(new CustomEvent('overlay.timer.pause'));
      });

      addEventSourceListener('overlay.timer.reset', () => {
        eventBus.dispatchEvent(new CustomEvent('overlay.timer.reset'));
      });

      addEventSourceListener('overlay.timer.start', () => {
        eventBus.dispatchEvent(new CustomEvent('overlay.timer.start'));
      });

      addEventSourceListener('toasterei.channel-points.show', (event) => {
        const detail = JSON.parse(event.data) as IEventStreamToastereiChannelPointsShowData;
        eventBus.dispatchEvent(new CustomEvent('toasterei.channel-points.show', { detail }));
      });

      addEventSourceListener('toasterei.wheel.shared-spin', (event) => {
        const detail = JSON.parse(event.data) as IEventStreamToastereiWheelSharedSpinData;
        eventBus.dispatchEvent(new CustomEvent('toasterei.wheel.shared-spin', { detail }));
      });

      eventSource.onopen = () => {
        console.info('[EventStream] Connection established');
        isConnecting.value = false;
        reconnectAttempts = 0;
      };

      eventSource.onerror = (error: Event) => {
        console.error('[EventStream] Error:', {
          type: error.type,
          eventPhase: error.eventPhase,
          target: error.target instanceof EventSource
            ? {
                url: error.target.url,
                readyState: error.target.readyState,
                withCredentials: error.target.withCredentials,
              }
            : null,
          currentTarget: error.currentTarget instanceof EventSource
            ? {
                url: error.currentTarget.url,
                readyState: error.currentTarget.readyState,
                withCredentials: error.currentTarget.withCredentials,
              }
            : null,
          bubbles: error.bubbles,
          cancelable: error.cancelable,
          defaultPrevented: error.defaultPrevented,
          timeStamp: error.timeStamp,
          readyState: eventSource?.readyState,
          reconnectAttempts,
          timestamp: new Date().toISOString(),
        });
        removeAllEventSourceListeners();
        eventSource?.close();
        eventSource = null;
        reconnectAttempts++;
        scheduleReconnect();
      };
    } catch (error) {
      console.error('Failed to create EventSource:', error);
      eventSource = null;
      isConnecting.value = false;
      reconnectAttempts++;
      scheduleReconnect();
    }
  }

  if (!isSetupComplete) {
    isSetupComplete = true;

    onMounted(() => {
      eventSourceSetup();
    });

    onBeforeUnmount(() => {
      if (reconnectTimeoutId) {
        clearTimeout(reconnectTimeoutId);
        reconnectTimeoutId = null;
      }
      removeAllEventSourceListeners();
      eventSource?.close();
      eventSource = null;
      isSetupComplete = false;
      isConnecting.value = false;
      reconnectAttempts = 0;
    });
  }

  return {
    on: <T>(event: string, callback: (data: T) => void) => {
      const listener = ((e: CustomEvent<T>) => callback(e.detail)) as EventListener;
      eventBus.addEventListener(event, listener);
      return () => eventBus.removeEventListener(event, listener);
    },
    off: (event: string, callback: EventListener) => {
      eventBus.removeEventListener(event, callback);
    },
    isConnecting,
  };
}
