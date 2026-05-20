export interface CloudInstance {
  setDensity(mult: number): void;
  pullTo(x: number, y: number, strength?: number): void;
  /**
   * Optional — present in newer builds. The FPS probe in
   * useWheelNavigation guards on this being defined so the cloud can
   * stay capped at its default density on platforms where it would
   * otherwise opt into a denser variant.
   */
  setBaseCount?(n: number): void;
  destroy(): void;
}

declare global {
  interface Window {
    __cloud?: CloudInstance;
    __setPos?: (v: number) => void;
    __pos?: () => { scrollPos: number; velocity: number; autoTarget: number | null };
    __nudge?: (dy: number) => void;
  }
}
