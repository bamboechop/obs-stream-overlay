import type { TProgramId } from '@/common/types/index.type';
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { GAME_METADATA } from '@/common/constants/game-metadata.constant';
import { useTwitchStore } from '@/stores/twitch.store';

export function useProgramInformationComposable() {
  const twitchStore = useTwitchStore();
  const { category } = storeToRefs(twitchStore);

  const iconPath = computed(() => {
    const { iconPath } = GAME_METADATA[category.value] ?? { iconPath: null };

    if (!iconPath) {
      return `/modern/programs/player.icon.png`;
    }

    return iconPath;
  });

  const programInformation = computed<Record<TProgramId, { iconPath: string }>>(() => ({
    'bsky-posts': {
      iconPath: `/modern/programs/bsky.icon.png`,
    },
    'chat': {
      iconPath: `/modern/programs/chat.icon.png`,
    },
    'end': {
      iconPath: `/modern/programs/end.icon.png`,
    },
    'intermission': {
      iconPath: `/modern/programs/intermission.icon.png`,
    },
    'media-player': {
      iconPath: iconPath.value,
    },
    'next-game': {
      iconPath: `/modern/programs/next-game.icon.png`,
    },
    'pdf-viewer': {
      iconPath: `/modern/programs/pdf-viewer.icon.png`,
    },
    'schedule': {
      iconPath: `/modern/programs/schedule.icon.png`,
    },
    'start': {
      iconPath: `/modern/programs/start.icon.png`,
    },
    'webcam': {
      iconPath: `/modern/programs/webcam.icon.png`,
    },
  }));

  return {
    iconPath,
    programInformation,
  };
}
