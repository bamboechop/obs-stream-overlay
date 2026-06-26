import type { ICiderApiMessage, ICiderPlaybackData, ICiderPlaybackStateData } from '@/common/interfaces/cider.interface';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { isCiderPlaybackEvent, parseSocketIOMessage } from '@/common/helpers/socket-io-parser.helper';

const eventBus = new EventTarget();
let webSocket: WebSocket | null = null;
const isConnecting = ref(false);
const isConnected = ref(false);
let reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
const reconnectDelay = 5000;
const maxReconnectAttempts = 5;
let reconnectAttempts = 0;
let isSetupComplete = false;
let volumeTransitionTimeout: ReturnType<typeof setTimeout> | null = null;

// Track current song for backend sync
const currentSongInfo = {
  artist: '',
  name: '',
  isPlaying: false,
};

const CIDER_APP_TOKEN = import.meta.env.VITE_CIDER_APP_TOKEN;

export function useCiderComposable() {
  async function sendSongToBackend(artist: string, name: string) {
    try {
      const response = await fetch(`${import.meta.env.VITE_BAMBBOT_API_URL}/misc/song`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ artist, name }),
      });

      if (!response.ok) {
        console.warn('[Cider] Failed to send song to backend:', response.status, response.statusText);
      } else {
        console.info('[Cider] Sent song to backend:', { artist, name });
      }
    } catch (error) {
      console.error('[Cider] Error sending song to backend:', error);
    }
  }

  function updateBackendSong() {
    const artist = currentSongInfo.isPlaying ? currentSongInfo.artist : '';
    const name = currentSongInfo.isPlaying ? currentSongInfo.name : '';
    sendSongToBackend(artist, name);
  }

  async function sendPlayPause(): Promise<boolean> {
    try {
      const response = await fetch('http://localhost:10767/api/v1/playback/playpause', {
        method: 'POST',
        headers: {
          apptoken: CIDER_APP_TOKEN,
        },
      });

      if (!response.ok) {
        console.warn('[Cider] Failed to set volume:', response.status, response.statusText);
        return false;
      }
      return true;
    } catch (error) {
      console.error('[Cider] Error sending play pause:', error);
      return false;
    }
  }

  async function setVolumeImmediate(volume: number): Promise<boolean> {
    // Clamp volume between 0 and 1, then round to 1 decimal place
    const clampedVolume = Math.max(0, Math.min(1, volume));
    const roundedVolume = Math.round(clampedVolume * 10) / 10;

    try {
      const response = await fetch('http://localhost:10767/api/v1/playback/volume', {
        method: 'POST',
        headers: {
          'apptoken': CIDER_APP_TOKEN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ volume: roundedVolume }),
      });

      if (!response.ok) {
        console.warn('[Cider] Failed to set volume:', response.status, response.statusText);
        return false;
      }
      return true;
    } catch (error) {
      console.error('[Cider] Error setting volume:', error);
      return false;
    }
  }

  async function setVolume(currentVolume: number, targetVolume: number) {
    console.info('[Cider] Setting volume:', currentVolume, targetVolume);
    // Clear any existing volume transition
    if (volumeTransitionTimeout) {
      clearTimeout(volumeTransitionTimeout);
      volumeTransitionTimeout = null;
    }

    // Clamp volumes between 0 and 1
    const clampedCurrent = Math.max(0, Math.min(1, currentVolume));
    const clampedTarget = Math.max(0, Math.min(1, targetVolume));

    // If volumes are the same, no transition needed
    if (Math.abs(clampedCurrent - clampedTarget) < 0.01) {
      return;
    }

    // Calculate step direction and number of steps
    const stepSize = 0.1;
    const difference = clampedTarget - clampedCurrent;
    const steps = Math.ceil(Math.abs(difference) / stepSize);
    const stepDirection = difference > 0 ? stepSize : -stepSize;

    // Send volume steps with delay - chain them properly
    let currentStep = 0;
    const sendNextStep = async () => {
      if (currentStep >= steps) {
        // Final step - ensure we're exactly at target (rounded to 1 decimal)
        const roundedTarget = Math.round(clampedTarget * 10) / 10;
        await setVolumeImmediate(roundedTarget);
        // If we're going to 0, send play pause to stop playback
        if (targetVolume === 0) {
          await sendPlayPause();
        }
        volumeTransitionTimeout = null;
        return;
      }

      // If this is the first step and we're going from 0 to 1, send play pause to start playback
      if (currentStep === 0 && targetVolume === 1 && currentVolume === 0) {
        await sendPlayPause();
      }

      const stepVolume = Math.max(0, Math.min(1, clampedCurrent + (stepDirection * (currentStep + 1))));
      // Round to 1 decimal place to avoid floating point precision issues
      const roundedStepVolume = Math.round(stepVolume * 10) / 10;
      const success = await setVolumeImmediate(roundedStepVolume);

      if (success) {
        currentStep++;
        volumeTransitionTimeout = setTimeout(sendNextStep, 250);
      } else {
        console.warn('[Cider] Volume transition stopped due to error');
        volumeTransitionTimeout = null;
      }
    };

    // Start the transition
    sendNextStep();
  }
  function scheduleReconnect() {
    if (reconnectTimeoutId) {
      clearTimeout(reconnectTimeoutId);
    }
    isConnecting.value = false;

    if (reconnectAttempts >= maxReconnectAttempts) {
      console.error('[Cider] Maximum reconnection attempts reached');
      reconnectAttempts = 0;
      return;
    }

    reconnectTimeoutId = setTimeout(() => {
      reconnectTimeoutId = null;
      connectWebSocket();
    }, reconnectDelay);
  }

  function connectWebSocket() {
    if ((webSocket && webSocket.readyState !== WebSocket.CLOSED) || isConnecting.value || reconnectTimeoutId) {
      return;
    }

    isConnecting.value = true;
    isConnected.value = false;

    webSocket?.close();

    try {
      // Try native WebSocket first - we'll need to test if this works with Cider
      webSocket = new WebSocket('ws://localhost:10767/socket.io/?EIO=4&transport=websocket');

      webSocket.onopen = () => {
        console.info('[Cider] WebSocket connection established');
        isConnecting.value = false;
        isConnected.value = true;
        reconnectAttempts = 0;

        // Dispatch connection status event
        eventBus.dispatchEvent(new CustomEvent('connection', { detail: true }));
      };

      webSocket.onmessage = (event) => {
        // Debug: Log all raw messages to see what we're receiving
        // console.debug('[Cider] Raw message received:', event.data);

        const parseResult = parseSocketIOMessage(event.data);

        if (!parseResult.success) {
          // Log ALL parsing errors to see what we're missing
          console.warn('[Cider] Message parsing failed:', parseResult.error, parseResult.rawData);
          return;
        }

        const { message } = parseResult;
        if (!message) {
          return;
        }

        // Handle Engine.IO handshake
        if (message.eventName === 'handshake') {
          console.info('[Cider] Engine.IO handshake received:', message.eventData);
          webSocket?.send('40');
          return;
        }

        // Handle Socket.IO connection events
        if (message.eventName === 'connect') {
          console.info('[Cider] Socket.IO connection confirmed:', message.eventData);
          // Socket.IO client doesn't send responses to connect events
          return;
        }

        // Handle ping/pong heartbeat
        if (message.eventName === 'ping') {
          // Respond to Engine.IO ping (2) with pong (3)
          webSocket?.send('3');
          console.info('[Cider] Heartbeat: Received ping (2), sent pong (3)');
          return;
        }

        // Handle Engine.IO pong responses (shouldn't normally receive these)
        if (message.eventName === 'pong') {
          console.debug('[Cider] Received pong:', message.eventData);
          return;
        }

        // Handle Cider API:Playback events
        if (isCiderPlaybackEvent(message)) {
          const apiMessage = message.eventData as ICiderApiMessage;

          // Handle song changes and playback state for backend sync
          switch (apiMessage.type) {
            case 'playbackStatus.nowPlayingItemDidChange': {
              const songData = apiMessage.data as ICiderPlaybackData;
              currentSongInfo.artist = songData.artistName;
              currentSongInfo.name = songData.name;
              currentSongInfo.isPlaying = true; // Assume playing when song changes
              updateBackendSong();
              break;
            }

            case 'playbackStatus.playbackStateDidChange': {
              const stateData = apiMessage.data as ICiderPlaybackStateData;
              const wasPlaying = currentSongInfo.isPlaying;
              currentSongInfo.artist = stateData.attributes?.artistName || '';
              currentSongInfo.name = stateData.attributes?.name || '';
              currentSongInfo.isPlaying = stateData.state === 'playing';

              // Only update backend if playback state actually changed
              if (wasPlaying !== currentSongInfo.isPlaying) {
                updateBackendSong();
              }
              break;
            }
          }

          eventBus.dispatchEvent(new CustomEvent('API:Playback', { detail: apiMessage }));
        } else {
          // Handle other Socket.IO events (like "message", etc.)
          console.info(`[Cider] Received event "${message.eventName}":`, message.eventData);

          // Dispatch generic events in case other parts of the app want to listen
          eventBus.dispatchEvent(new CustomEvent(`cider:${message.eventName}`, { detail: message.eventData }));
        }
      };

      webSocket.onerror = (error) => {
        console.error('[Cider] WebSocket error:', error);
        isConnecting.value = false;
        isConnected.value = false;
        reconnectAttempts++;
        scheduleReconnect();

        // Dispatch connection status event
        eventBus.dispatchEvent(new CustomEvent('connection', { detail: false }));
      };

      webSocket.onclose = (event) => {
        console.warn('[Cider] WebSocket connection closed unexpectedly:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
          timestamp: new Date().toISOString(),
        });
        isConnecting.value = false;
        isConnected.value = false;
        webSocket = null;

        if (event.code !== 1000) { // Not a normal closure
          reconnectAttempts++;
          scheduleReconnect();
        }

        // Dispatch connection status event
        eventBus.dispatchEvent(new CustomEvent('connection', { detail: false }));
      };
    } catch (error) {
      console.error('[Cider] Failed to create WebSocket:', error);
      webSocket = null;
      isConnecting.value = false;
      isConnected.value = false;
      reconnectAttempts++;
      scheduleReconnect();
    }
  }

  if (!isSetupComplete) {
    isSetupComplete = true;

    onMounted(() => {
      connectWebSocket();
    });

    onBeforeUnmount(() => {
      if (reconnectTimeoutId) {
        clearTimeout(reconnectTimeoutId);
        reconnectTimeoutId = null;
      }
      webSocket?.close();
      webSocket = null;
      isSetupComplete = false;
      isConnecting.value = false;
      isConnected.value = false;
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
    isConnected,
    reconnect: connectWebSocket,
    setVolume,
  };
}
