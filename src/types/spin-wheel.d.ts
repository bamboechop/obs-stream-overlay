declare module 'spin-wheel' {
  export interface WheelCurrentIndexChangeEvent {
    type: 'currentIndexChange';
    currentIndex: number;
  }

  export interface WheelRestEvent {
    type: 'rest';
    currentIndex: number;
    rotation: number;
  }

  export interface WheelSpinEvent {
    type: 'spin';
    duration?: number;
    method: 'interact' | 'spin' | 'spinTo' | 'spinToItem';
    rotationResistance?: number;
    rotationSpeed?: number;
    targetItemIndex?: number;
    targetRotation?: number;
  }

  export interface WheelItemInput {
    backgroundColor?: string | null;
    image?: HTMLImageElement | string | null;
    imageOpacity?: number;
    imageRadius?: number;
    imageRotation?: number;
    imageScale?: number;
    label?: string;
    labelColor?: string | null;
    value?: number | null;
    weight?: number;
  }

  export interface WheelItem extends WheelItemInput {
    getCenterAngle: () => number;
    getEndAngle: () => number;
    getIndex: () => number;
    getRandomAngle: () => number;
    getStartAngle: () => number;
    init: (props?: Partial<WheelItemInput>) => void;
  }

  export interface WheelOffset {
    x: number;
    y: number;
  }

  export interface WheelConfig {
    borderColor?: string;
    borderWidth?: number;
    debug?: boolean;
    image?: HTMLImageElement | string | null;
    isInteractive?: boolean;
    itemBackgroundColors?: string[];
    itemLabelAlign?: 'left' | 'center' | 'right';
    itemLabelBaselineOffset?: number;
    itemLabelColors?: string[];
    itemLabelFont?: string;
    itemLabelFontSizeMax?: number;
    itemLabelRadius?: number;
    itemLabelRadiusMax?: number;
    itemLabelRotation?: number;
    itemLabelStrokeColor?: string;
    itemLabelStrokeWidth?: number;
    items?: WheelItemInput[];
    lineColor?: string;
    lineWidth?: number;
    offset?: WheelOffset;
    onCurrentIndexChange?: (event: WheelCurrentIndexChangeEvent) => void;
    onRest?: (event: WheelRestEvent) => void;
    onSpin?: (event: WheelSpinEvent) => void;
    overlayImage?: HTMLImageElement | string | null;
    pixelRatio?: number;
    pointerAngle?: number;
    radius?: number;
    rotation?: number;
    rotationResistance?: number;
    rotationSpeed?: number;
    rotationSpeedMax?: number;
  }

  export class Wheel {
    constructor(container: HTMLElement, props?: WheelConfig | null);
    init(props?: WheelConfig): void;
    resize(): void;
    remove(): void;
    spin(rotationSpeed?: number): void;
    spinTo(rotation?: number, duration?: number, easingFunction?: ((n: number) => number) | null): void;
    spinToItem(itemIndex?: number, duration?: number, spinToCenter?: boolean, numberOfRevolutions?: number, direction?: number, easingFunction?: ((n: number) => number) | null): void;
    stop(): void;
    getCurrentIndex(): number;
    // Properties
    borderColor: string;
    borderWidth: number;
    debug: boolean;
    image: HTMLImageElement | string | null;
    isInteractive: boolean;
    itemBackgroundColors: string[];
    itemLabelAlign: 'left' | 'center' | 'right';
    itemLabelBaselineOffset: number;
    itemLabelColors: string[];
    itemLabelFont: string;
    itemLabelFontSizeMax: number;
    itemLabelRadius: number;
    itemLabelRadiusMax: number;
    itemLabelRotation: number;
    itemLabelStrokeColor: string;
    itemLabelStrokeWidth: number;
    items: WheelItem[];
    lineColor: string;
    lineWidth: number;
    offset: WheelOffset;
    onCurrentIndexChange: ((event: WheelCurrentIndexChangeEvent) => void) | null;
    onRest: ((event: WheelRestEvent) => void) | null;
    onSpin: ((event: WheelSpinEvent) => void) | null;
    overlayImage: HTMLImageElement | string | null;
    pixelRatio: number;
    pointerAngle: number;
    radius: number;
    rotation: number;
    readonly rotationSpeed: number;
    rotationResistance: number;
    rotationSpeedMax: number;
  }
}
