import type { TProgramId } from '@/common/types/index.type';
import OBSWebSocket from 'obs-websocket-js';
import { storeToRefs } from 'pinia';
import { onBeforeUnmount } from 'vue';
import { RequestCache } from '@/services/request-cache.service';
import { useApplicationStore } from '@/stores/application.store';
import { useStreamStatusStore } from '@/stores/stream-status.store';
import { useTwitchStore } from '@/stores/twitch.store';

interface ISceneItemMapping {
  programId: TProgramId;
  sourceName?: string;
}

interface ISceneMapping {
  [sceneItemId: number]: ISceneItemMapping;
}

const obsSceneMappings: { [sceneUuid: string]: ISceneMapping } = {
  // Default mapping for all scenes
  '*': {
    19: { programId: 'bsky-posts' },
    41: { programId: 'media-player' },
    50: { programId: 'webcam' },
    51: { programId: 'webcam' },
    69: { programId: 'pdf-viewer' },
    98: { programId: 'next-game' },
  },
  '3cdbaeca-19a3-419e-b665-097a3298f557': { /// "Gleich gehts los" scene
    4: { programId: 'start' },
    19: { programId: 'bsky-posts' },
  },
  '55c662f0-2b05-4278-8ac3-f7bf9e8159d4': { // "Kurze Pause" scene
    5: { programId: 'intermission' },
    16: { programId: 'bsky-posts' },
  },
  '7bb22505-8353-471d-9e9a-de3cbdc4e1aa': { // "Ende" scene
    6: { programId: 'end' },
    12: { programId: 'schedule', sourceName: 'Schedule' },
    15: { programId: 'bsky-posts' },
  },
};

export async function useObsComposable() {
  /*
   * needs to be before any async call otherwise Vue will show a warning in the console
   * [Vue warn]: onBeforeUnmount is called when there is no active component instance to be associated with.
   * Lifecycle injection APIs can only be used during execution of setup(). If you are using async setup(),
   * make sure to register lifecycle hooks before the first await statement.
   */
  onBeforeUnmount(async () => {
    await disconnectWebSocketConnection();
  });

  const applicationStore = useApplicationStore();
  const {
    applyVisibilityFromScene,
  } = applicationStore;

  const streamStatusStore = useStreamStatusStore();
  const { live } = storeToRefs(streamStatusStore);

  const twitchStore = useTwitchStore();
  const { getAdSchedule, resetAdState } = twitchStore;

  const obs = new OBSWebSocket();
  await obs.connect(import.meta.env.VITE_OBS_WEBSOCKET_URL, import.meta.env.VITE_OBS_WEBSOCKET_PASSWORD);

  function dedupeByLastOccurrence(ids: TProgramId[]): TProgramId[] {
    const seen = new Set<TProgramId>();
    const result: TProgramId[] = [];

    for (let index = ids.length - 1; index >= 0; index -= 1) {
      const id = ids[index];
      if (!seen.has(id)) {
        seen.add(id);
        result.push(id);
      }
    }

    return result.reverse();
  }

  async function getSceneItems(): Promise<TProgramId[]> {
    const { currentProgramSceneUuid: sceneUuid } = await obs.call('GetSceneList');
    const sceneItemList = await obs.call('GetSceneItemList', { sceneUuid });

    // Get the scene-specific mapping or fall back to the default mapping
    const sceneMapping = obsSceneMappings[sceneUuid] || obsSceneMappings['*'];
    const sceneSourceNameMapping = new Map<string, ISceneItemMapping>();
    for (const mapping of Object.values(sceneMapping)) {
      if (mapping.sourceName) {
        sceneSourceNameMapping.set(mapping.sourceName, mapping);
      }
    }
    const visibleIdsInSceneOrder: TProgramId[] = [];

    for (const item of sceneItemList.sceneItems) {
      const mapping = sceneMapping[item.sceneItemId as number]
        ?? (typeof item.sourceName === 'string' ? sceneSourceNameMapping.get(item.sourceName) : undefined);
      if (mapping) {
        // If sourceName is specified in the mapping, verify it matches
        if (!mapping.sourceName || mapping.sourceName === item.sourceName) {
          if (item.sceneItemEnabled) {
            visibleIdsInSceneOrder.push(mapping.programId);
          }
        }
      }
    }
    return dedupeByLastOccurrence(visibleIdsInSceneOrder);
  }

  // handle scene switches
  obs.on('CurrentProgramSceneChanged', async (event) => {
    // wait for 100ms before updating the visibility, otherwise the active window isn't getting highlighted when switching scenes
    window.setTimeout(async () => {
      const latestVisibleIdsInSceneOrder = await getSceneItems();
      applyVisibilityFromScene(latestVisibleIdsInSceneOrder);
    }, 100);
    if (live.value && event.sceneUuid === '7bb22505-8353-471d-9e9a-de3cbdc4e1aa') { // Ende scene
      try {
        await RequestCache.request(`${import.meta.env.VITE_BAMBBOT_API_URL}/twitch/share-next-planned-stream`, {
          method: 'GET',
        }, 10);
      } catch (error) {
        if (error instanceof Error && error.message === 'REQUEST_RECENTLY_MADE_BY_OTHER_INSTANCE') {
          return;
        }
        throw error;
      }
    }
  });

  // handle source visibility changes
  obs.on('SceneItemEnableStateChanged', async () => {
    const visibleIdsInSceneOrder = await getSceneItems();
    applyVisibilityFromScene(visibleIdsInSceneOrder);
  });

  /**
   * Handles stream state changes (going live / offline).
   * @param {object} event - The event object.
   * @param {boolean} event.outputActive - Indicates if the output is active.
   * @param {string} event.outputState - The state of the output.
   * Possible values: OBS_WEBSOCKET_OUTPUT_STARTING, OBS_WEBSOCKET_OUTPUT_STARTED, OBS_WEBSOCKET_OUTPUT_STOPPING, OBS_WEBSOCKET_OUTPUT_STOPPED.
   */
  obs.on('StreamStateChanged', async (event) => {
    live.value = event.outputActive;
    if (live.value) {
      // Wait 15 seconds for Twitch to update ad schedule after going live
      // This should catch pre-roll ads that happen immediately
      window.setTimeout(async () => {
        await getAdSchedule();
      }, 15 * 1000);
    } else {
      // Reset ad state when stream goes offline
      resetAdState();
    }
  });

  async function disconnectWebSocketConnection() {
    await obs.disconnect();
  }

  window.addEventListener('beforeunload', async () => {
    await disconnectWebSocketConnection();
  });

  const visibleIdsInSceneOrder = await getSceneItems();
  applyVisibilityFromScene(visibleIdsInSceneOrder);
}
