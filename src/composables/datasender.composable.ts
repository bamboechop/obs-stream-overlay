import { onMounted, onUnmounted, readonly, shallowRef } from 'vue';

export interface DataSenderState {
  connected: boolean;
  raceData: { cpCount: number; cpsToFinish: number; lapsNb: number } | null;
  playerCpInfo: { cpCount: number; isLocalPlayer: true; playerIsRacing: boolean; isFinished: boolean } | null;
  vehicleType: 'CarDesert' | 'CarRally' | 'CarSnow' | 'CarSport' | null;
  progress: { gatesPerLap: number; currentLap: number; currentCp: number } | null;
}

const emptyState = (): DataSenderState => ({ connected: false, raceData: null, playerCpInfo: null, vehicleType: null, progress: null });
const state = shallowRef<DataSenderState>(emptyState());
const bridgeConnected = shallowRef(false);
let source: EventSource | null = null;
let consumers = 0;

/** One shared browser connection, retained until the last component unmounts. */
export function useDataSender() {
  onMounted(() => {
    consumers++;
    if (source) {
      return;
    }
    source = new EventSource(import.meta.env.VITE_DATASENDER_URL || 'http://127.0.0.1:28766/events');
    source.onopen = () => {
      bridgeConnected.value = true;
    };
    source.onmessage = (event) => {
      try {
        state.value = JSON.parse(event.data) as DataSenderState;
      } catch {
        state.value = emptyState();
      }
    };
    source.onerror = () => {
      bridgeConnected.value = false;
      state.value = emptyState();
      // EventSource automatically reconnects; the bridge replays its latest state.
    };
  });
  onUnmounted(() => {
    consumers--;
    if (consumers === 0) {
      source?.close();
      source = null;
      bridgeConnected.value = false;
      state.value = emptyState();
    }
  });
  return { state: readonly(state), bridgeConnected: readonly(bridgeConnected) };
}
