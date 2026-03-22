<template>
  <WindowFrame
    :active="active"
    :icon-path="programInformation['next-game'].iconPath"
    title="Nächstes Spiel">
    <div class="bg-[#0e0e10] rounded-sm text-white flex flex-col text-base gap-3 leading-normal pt-[78px] pb-3 px-6 relative">
      <p>
        Ich besitze eine Steam Bibliothek mit über 680 Spielen. Davon sind über 400 Spiele bis heute ungespielt. Das ändert sich ab sofort.<br />
        Der Zufall entscheidet, welches Spiel wir als nächstes gemeinsam im Stream spielen.
      </p>
      <h2>
        Die Regeln
      </h2>
      <ul class="text-sm pl-6 list-[square]">
        <li>
          Jedes Spiel wird zufällig ausgewählt.
        </li>
        <li>
          Jedes gewählte Spiel wird zumindest für eine Stunde im Stream gespielt.
        </li>
      </ul>
      <h2>
        Kategorie
      </h2>
      <div>
        <FlipText
          ref="categoryFlipText"
          :words="categories"
          @word-selected="handleCategorySelected" />
      </div>
      <h2>
        Spiel
      </h2>
      <div>
        <FlipText
          ref="gameFlipText"
          :words="games"
          @word-selected="handleGameSelected" />
      </div>
      <p class="text-xs text-right">
        Idee inspiriert von unstablesparkey und seinen "Steam Roulette" Reels auf Instagram.
      </p>
      <div
        class="items-center bg-black/85 rounded-sm bottom-0 text-[#dedede] flex flex-col text-2xl gap-6 justify-center left-0 opacity-0 p-6 pointer-events-none absolute right-0 text-center transition-opacity duration-300 ease-in-out top-0 z-10"
        :class="{ 'opacity-100': selectedGame }">
        Gewonnen hat
        <p class="text-white font-doto text-5xl font-bold">
          {{ selectedGame }}!
        </p>
        Zur Auswahl standen: {{ games.join(', ') }}.
      </div>
    </div>
  </WindowFrame>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import FlipText from './FlipText.vue';
import WindowFrame from '@/components/desktop/WindowFrame.vue';
import { UNPLAYED_GAMES } from '@/common/constants/unplayed-games.constant';
import { useEventStreamComposable } from '@/composables/event-stream.composable';
import { useProgramInformationComposable } from '@/composables/program-information.composable';

defineProps<{ active?: boolean }>();

const { programInformation } = useProgramInformationComposable();

const { on } = useEventStreamComposable();

const categories = [
  '4X Strategy',
  'Action',
  'Action RPG',
  'Action-Adventure',
  'Adventure',
  'Arcade',
  'Battle Royale',
  'Beat \'em up',
  'Business Simulation',
  'Card Game',
  'City Building',
  'Compilation',
  'Exploration',
  'Farming Simulation',
  'Fighting',
  'First-Person Shooter',
  'Flight Simulator',
  'Grand Strategy',
  'Hidden Object',
  'Interactive Fiction',
  'Metroidvania',
  'Military Simulator',
  'MOBA',
  'Music',
  'Party Game',
  'Physics Sandbox',
  'Pinball',
  'Platformer',
  'Point-and-Click Adventure',
  'Puzzle',
  'Puzzle Platformer',
  'Racing',
  'Real-Time Strategy',
  'Roguelike',
  'Role-Playing Game',
  'Run and Gun',
  'Simulation',
  'Sports',
  'Stealth',
  'Stealth Platformer',
  'Strategy',
  'Survival',
  'Survival Horror',
  'Third-Person Shooter',
  'Time Management',
  'Tower Defense',
  'Turn-Based Strategy',
  'Visual Novel',
];

const selectedCategory = ref<string | null>(null);
const selectedGame = ref<string | null>(null);
const categoryFlipText = ref<InstanceType<typeof FlipText> | null>(null);
const gameFlipText = ref<InstanceType<typeof FlipText> | null>(null);

const games = computed(() => {
  if (!selectedCategory.value) {
    return [];
  }

  return UNPLAYED_GAMES.filter(game => game.genre === selectedCategory.value).map(game => game.name);
});

function handleCategorySelected(category: string) {
  selectedCategory.value = category;
}

function handleGameSelected(game: string) {
  selectedGame.value = game;
}

onMounted(() => {
  on('overlay.roll.category', () => {
    selectedCategory.value = null;
    selectedGame.value = null;
    categoryFlipText.value?.toggleAutoCycle();
  });

  on('overlay.roll.game', () => {
    gameFlipText.value?.toggleAutoCycle();
  });
});
</script>
