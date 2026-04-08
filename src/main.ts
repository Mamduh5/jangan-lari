import Phaser from 'phaser';
import { gameConfig } from './game/config/gameConfig';
import './style.css';

const game = new Phaser.Game(gameConfig);

if (typeof window !== 'undefined') {
  window.__JANGAN_LARI_GAME__ = game;
}
