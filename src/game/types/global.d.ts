import type Phaser from 'phaser';
import type { GameplayDebugHandle } from '../debug/gameplaySnapshot';

declare global {
  interface Window {
    __JANGAN_LARI_GAME__?: Phaser.Game;
    __JANGAN_LARI_DEBUG__?: GameplayDebugHandle;
  }
}

export {};
