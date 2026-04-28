<template>
  <div class="h-full flex items-end">
    <Transition name="wheel-fade">
      <div
        v-show="isWheelVisible"
        ref="container"
        class="bg-[#3c332e] rounded-t-full max-w-3xl border-12 border-white/75 shadow-2xl pb-16 mx-auto w-full">
        <div
          ref="wheelContainer"
          class="aspect-square w-full"></div>
        <template v-if="userName">
          <div class="text-center text-white font-semibold text-2xl flex flex-col items-center px-4 min-h-[320px]">
            <p class="min-h-16 flex items-center justify-center">
              <template v-if="!showSpinResult">
                {{ userName }} dreht am Glücksrad der Toasterei! Viel Glück.
              </template>
              <template v-else-if="spinResult?.product">
                {{ userName }} hat {{ spinResult.product.name }} gewonnen!
              </template>
              <template v-else>
                {{ userName }} hat leider nicht gewonnen.
              </template>
            </p>
            <div class="h-64 flex items-center justify-center">
              <img
                v-if="showSpinResult && spinResult?.product"
                :alt="spinResult.product.name"
                class="w-64 h-64 object-contain"
                :src="spinResult.product.imageUrl" />
            </div>
          </div>
        </template>
      </div>
    </Transition>
    <audio
      ref="winAudio"
      preload="auto"
      src="/audio/toasterei-wheel-spin/you-win.mp3"></audio>
    <audio
      ref="loseAudio"
      preload="auto"
      src="/audio/toasterei-wheel-spin/you-lose.mp3"></audio>
  </div>
</template>

<script setup lang="ts">
import type { WheelConfig, WheelItemInput } from 'spin-wheel';
import type { IEventStreamToastereiWheelSharedSpinData } from '@/common/interfaces/event-stream.interface';
import confetti from '@hiseb/confetti';
import { useMediaControls } from '@vueuse/core';
import { Wheel } from 'spin-wheel';
import { nextTick, onMounted, onUnmounted, ref, useTemplateRef } from 'vue';
import { useEventStreamComposable } from '@/composables/event-stream.composable';

interface WheelResult {
  winningSegmentId: number;
  product?: any;
}

interface QueuedWheelSpin {
  userName: string;
  winningSegmentId: number;
  product?: any;
  weights?: {
    nothingWeight?: number;
    channelPointsWeight?: number;
    bitsWeight?: number;
  };
}

const { on } = useEventStreamComposable();

const audioElement = ref<HTMLAudioElement | null>(null);
const loseAudioRef = useTemplateRef<HTMLAudioElement>('loseAudio');
const { currentTime: loseAudioCurrentTime, playing: loseAudioPlaying, volume: loseAudioVolume } = useMediaControls(loseAudioRef, { src: '/audio/toasterei-wheel-spin/you-lose.mp3' });
const winAudioRef = useTemplateRef<HTMLAudioElement>('winAudio');
const { currentTime: winAudioCurrentTime, playing: winAudioPlaying, volume: winAudioVolume } = useMediaControls(winAudioRef, { src: '/audio/toasterei-wheel-spin/you-win.mp3' });

const containerRef = useTemplateRef<HTMLElement>('container');
const isSpinning = ref(false);
const isWheelVisible = ref(false);
const isProcessingQueue = ref(false);
const spinResult = ref<WheelResult | null>(null);
const spinQueue = ref<QueuedWheelSpin[]>([]);
const showSpinResult = ref(false);
const userName = ref('');
const wheelContainerRef = useTemplateRef<HTMLElement>('wheelContainer');
const wheelInstance = ref<Wheel | null>(null);
const wheelItems = ref<WheelItemInput[]>([]);
const wheelWeights = ref({ nothingWeight: 85, channelPointsWeight: 10, bitsWeight: 5 });
const queuedSpinTimeoutId = ref<ReturnType<typeof setTimeout> | null>(null);
const resetAfterResultTimeoutId = ref<ReturnType<typeof setTimeout> | null>(null);
const queueCooldownTimeoutId = ref<ReturnType<typeof setTimeout> | null>(null);
let unsubscribeSharedSpin: (() => void) | null = null;
let completeCurrentSpinCycle: (() => void) | null = null;

type WheelImageKey = 'bits' | 'channelPoints' | 'nothing' | 'overlay';

const WHEEL_IMAGE_URLS: Record<WheelImageKey, string> = {
  bits: '/wheel/bits.svg',
  channelPoints: '/wheel/channelpoints.svg',
  nothing: '/wheel/nothing.svg',
  overlay: '/wheel/overlay.svg',
};

const imageCache = new Map<string, HTMLImageElement>();
const images: Record<WheelImageKey, HTMLImageElement | null> = {
  bits: null,
  channelPoints: null,
  nothing: null,
  overlay: null,
};

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const cachedImage = imageCache.get(url);
    if (cachedImage?.complete) {
      resolve(cachedImage);
      return;
    }

    const img = new Image();
    img.onload = () => {
      imageCache.set(url, img);
      resolve(img);
    };
    img.onerror = () => {
      console.warn(`Failed to load ${url} image`);
      reject(new Error(`Failed to load ${url} image`));
    };
    img.src = url;
  });
}

async function preloadImages() {
  const [overlayImage, channelPointsImage, bitsImage, nothingImage] = await Promise.all([
    loadImage(WHEEL_IMAGE_URLS.overlay),
    loadImage(WHEEL_IMAGE_URLS.channelPoints),
    loadImage(WHEEL_IMAGE_URLS.bits),
    loadImage(WHEEL_IMAGE_URLS.nothing),
  ]);
  images.bits = bitsImage;
  images.channelPoints = channelPointsImage;
  images.nothing = nothingImage;
  images.overlay = overlayImage;
}

function buildWheelItems(
  weights: { nothingWeight: number; channelPointsWeight: number; bitsWeight: number },
  channelPointsImage: HTMLImageElement,
  bitsImage: HTMLImageElement,
  nothingImage: HTMLImageElement,
): WheelItemInput[] {
  const items: WheelItemInput[] = [];

  // Add Channel Points segment if available
  if (weights.channelPointsWeight > 0) {
    items.push({
      image: channelPointsImage,
      imageRadius: 0.6,
      imageScale: 0.1,
      weight: weights.channelPointsWeight,
      value: 1,
      backgroundColor: '#1705b4',
    });
  }

  // Add Bits segment if available
  if (weights.bitsWeight > 0) {
    items.push({
      image: bitsImage,
      imageRadius: 0.6,
      imageScale: 0.1,
      weight: weights.bitsWeight,
      value: 2,
      backgroundColor: '#8205B4',
    });
  }

  items.push({
    image: nothingImage,
    imageRadius: 0.6,
    imageScale: 0.1,
    weight: weights.nothingWeight,
    value: 3,
    backgroundColor: '#6b7280',
  });

  return items;
}

function clearQueuedSpinTimer() {
  if (queuedSpinTimeoutId.value) {
    clearTimeout(queuedSpinTimeoutId.value);
    queuedSpinTimeoutId.value = null;
  }
}

function clearResultResetTimer() {
  if (resetAfterResultTimeoutId.value) {
    clearTimeout(resetAfterResultTimeoutId.value);
    resetAfterResultTimeoutId.value = null;
  }
}

function clearCooldownTimer() {
  if (queueCooldownTimeoutId.value) {
    clearTimeout(queueCooldownTimeoutId.value);
    queueCooldownTimeoutId.value = null;
  }
}

function resetDisplayState() {
  userName.value = '';
  spinResult.value = null;
  showSpinResult.value = false;
  isSpinning.value = false;
}

function finishCurrentSpinCycle() {
  if (!completeCurrentSpinCycle) {
    return;
  }
  const done = completeCurrentSpinCycle;
  completeCurrentSpinCycle = null;
  done();
}

function disposeWheel() {
  if (wheelInstance.value) {
    wheelInstance.value.remove();
    wheelInstance.value = null;
  }
  wheelContainerRef.value?.replaceChildren();
}

function schedulePostSpinLifecycle() {
  showSpinResult.value = true;
  clearResultResetTimer();
  clearCooldownTimer();

  resetAfterResultTimeoutId.value = setTimeout(() => {
    isWheelVisible.value = false;
    window.setTimeout(() => {
      resetDisplayState();
    }, 500);

    queueCooldownTimeoutId.value = setTimeout(() => {
      finishCurrentSpinCycle();
      void processQueuedSpins();
    }, 10000);
  }, 5000);
}

function initializeWheel(overlayImage: HTMLImageElement, channelPointsImage: HTMLImageElement, bitsImage: HTMLImageElement, nothingImage: HTMLImageElement) {
  if (!wheelContainerRef.value) {
    return false;
  }

  disposeWheel();

  wheelItems.value = buildWheelItems(wheelWeights.value, channelPointsImage, bitsImage, nothingImage);

  if (wheelItems.value.length === 0) {
    console.error('No wheel items to display');
    return false;
  }

  const wheelConfig: WheelConfig = {
    borderColor: '#2d2521',
    borderWidth: 10,
    items: wheelItems.value,
    lineWidth: 0,
    pointerAngle: 180,
    overlayImage,
    rotationResistance: 0,
    rotationSpeedMax: 100000,
    radius: 0.9,
    onCurrentIndexChange: () => {
      if (audioElement.value) {
        audioElement.value.currentTime = 0;
        audioElement.value.play().catch((err) => {
          console.warn('Could not play audio:', err);
        });
      }
    },
    onRest: () => {
      isSpinning.value = false;
      if (spinResult.value) {
        if (spinResult.value.product) {
          if (winAudioRef.value) {
            winAudioCurrentTime.value = 0;
            winAudioPlaying.value = true;
          }
          const containerRect = containerRef.value?.getBoundingClientRect();
          confetti({
            position: {
              x: (containerRect?.left ?? 0) + (containerRect?.width ?? 0) / 2,
              y: containerRect?.top ?? 0,
            },
          });
        } else {
          if (loseAudioRef.value) {
            loseAudioCurrentTime.value = 0;
            loseAudioPlaying.value = true;
          }
        }
      }
      schedulePostSpinLifecycle();
    },
  };

  wheelInstance.value = new Wheel(wheelContainerRef.value, wheelConfig);
  return true;
}

function handleSpin(result: WheelResult) {
  if (isSpinning.value || !wheelInstance.value) {
    return;
  }

  spinResult.value = result;
  showSpinResult.value = false;
  isSpinning.value = true;

  wheelInstance.value.spin(750);
  const itemIndex = wheelItems.value.findIndex((item: WheelItemInput) => item.value === result.winningSegmentId);

  if (itemIndex === -1) {
    console.error('Could not find item index for winning segment', result.winningSegmentId);
    isSpinning.value = false;
    schedulePostSpinLifecycle();
    return;
  }

  wheelInstance.value.spinToItem(itemIndex, 5000, false, 5, 1);
}

async function processSingleSpin(spinData: QueuedWheelSpin): Promise<void> {
  let resolveSpinCycle!: () => void;
  const spinCyclePromise = new Promise<void>((resolve) => {
    resolveSpinCycle = resolve;
  });
  completeCurrentSpinCycle = resolveSpinCycle;

  try {
    resetDisplayState();
    userName.value = spinData.userName;
    await nextTick();

    if (!images.overlay || !images.channelPoints || !images.bits || !images.nothing) {
      await preloadImages();
    }
    wheelWeights.value = {
      nothingWeight: spinData.weights?.nothingWeight ?? 85,
      channelPointsWeight: spinData.weights?.channelPointsWeight ?? 10,
      bitsWeight: spinData.weights?.bitsWeight ?? 5,
    };

    const wheelInitialized = initializeWheel(images.overlay!, images.channelPoints!, images.bits!, images.nothing!);
    if (!wheelInitialized) {
      throw new Error('Failed to initialize toasterei wheel');
    }

    isWheelVisible.value = true;
    clearQueuedSpinTimer();
    queuedSpinTimeoutId.value = setTimeout(() => {
      handleSpin({
        winningSegmentId: spinData.winningSegmentId,
        product: spinData.product,
      });
    }, 2000);
  } catch (error) {
    console.error('Failed to start toasterei wheel spin:', error);
    resetDisplayState();
    finishCurrentSpinCycle();
  }

  return spinCyclePromise;
}

async function processQueuedSpins() {
  if (isProcessingQueue.value) {
    return;
  }
  const nextSpin = spinQueue.value.shift();
  if (!nextSpin) {
    return;
  }

  isProcessingQueue.value = true;
  try {
    await processSingleSpin(nextSpin);
  } finally {
    isProcessingQueue.value = false;
    if (spinQueue.value.length > 0) {
      void processQueuedSpins();
    }
  }
}

onMounted(async () => {
  loseAudioVolume.value = 0.85;
  winAudioVolume.value = 1;

  audioElement.value = new Audio('/audio/relay-switch.wav');
  audioElement.value.preload = 'auto';
  audioElement.value.volume = 1;

  unsubscribeSharedSpin = on<IEventStreamToastereiWheelSharedSpinData>('toasterei.wheel.shared-spin', async (data) => {
    spinQueue.value.push({
      userName: data.userName,
      winningSegmentId: data.winningSegmentId,
      product: data.product,
      weights: data.weights,
    });
    void processQueuedSpins();
  });
});

onUnmounted(() => {
  clearQueuedSpinTimer();
  clearResultResetTimer();
  clearCooldownTimer();
  spinQueue.value = [];
  unsubscribeSharedSpin?.();
  disposeWheel();
  finishCurrentSpinCycle();
});
</script>

<style scoped>
.wheel-fade-enter-active,
.wheel-fade-leave-active {
  transition: opacity 350ms ease;
}

.wheel-fade-enter-from,
.wheel-fade-leave-to {
  opacity: 0;
}
</style>
