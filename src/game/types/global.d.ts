import type Phaser from 'phaser';

declare global {
  interface Window {
    __JANGAN_LARI_GAME__?: Phaser.Game;
  }
}

export {};
