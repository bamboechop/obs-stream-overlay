import type { TProgramId } from '@/common/types/index.type';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export const useApplicationStore = defineStore('Application Store', () => {
  const visibleProgramIds = ref<TProgramId[]>([]);
  const intermissionVideoPlaying = ref(false);

  const activeProgramId = computed(() => {
    if (visibleProgramIds.value.length === 0) {
      return null;
    }
    return visibleProgramIds.value[visibleProgramIds.value.length - 1];
  });

  const applyVisibilityFromScene = (visibleIdsInSceneOrder: TProgramId[]) => {
    const visibleIds = new Set(visibleIdsInSceneOrder);

    visibleProgramIds.value = visibleProgramIds.value.filter(id => visibleIds.has(id));

    for (const id of visibleIdsInSceneOrder) {
      if (!visibleProgramIds.value.includes(id)) {
        visibleProgramIds.value.push(id);
      }
    }

    const lastVisibleId = visibleIdsInSceneOrder[visibleIdsInSceneOrder.length - 1];
    if (lastVisibleId && visibleProgramIds.value.includes(lastVisibleId)) {
      visibleProgramIds.value = visibleProgramIds.value.filter(id => id !== lastVisibleId);
      visibleProgramIds.value.push(lastVisibleId);
    }
  };

  return {
    visibleProgramIds,
    activeProgramId,
    intermissionVideoPlaying,
    applyVisibilityFromScene,
  };
});
