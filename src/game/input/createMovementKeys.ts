import Phaser from 'phaser';

export type MovementKeys = {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  altUp: Phaser.Input.Keyboard.Key;
  altDown: Phaser.Input.Keyboard.Key;
  altLeft: Phaser.Input.Keyboard.Key;
  altRight: Phaser.Input.Keyboard.Key;
};

export function createMovementKeys(scene: Phaser.Scene): MovementKeys {
  const keyboard = scene.input.keyboard;

  if (!keyboard) {
    throw new Error('Keyboard input is unavailable.');
  }

  return keyboard.addKeys({
    up: Phaser.Input.Keyboard.KeyCodes.W,
    down: Phaser.Input.Keyboard.KeyCodes.S,
    left: Phaser.Input.Keyboard.KeyCodes.A,
    right: Phaser.Input.Keyboard.KeyCodes.D,
    altUp: Phaser.Input.Keyboard.KeyCodes.UP,
    altDown: Phaser.Input.Keyboard.KeyCodes.DOWN,
    altLeft: Phaser.Input.Keyboard.KeyCodes.LEFT,
    altRight: Phaser.Input.Keyboard.KeyCodes.RIGHT,
  }) as MovementKeys;
}
