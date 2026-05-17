// Global runtime dimensions
export const GAME_WIDTH = 1600;
export const GAME_HEIGHT = 720;

export const WORLD_WIDTH = 2000;
export const WORLD_HEIGHT = 1400;
export const CAMERA_OVERSCROLL_PADDING_X = GAME_WIDTH / 2;
export const CAMERA_OVERSCROLL_PADDING_Y = GAME_HEIGHT / 2;

// Visual feedback
export const PLAYER_HIT_SHAKE_DURATION_MS = 90;
export const PLAYER_HIT_SHAKE_INTENSITY = 0.0032;

// Audio
export const AUDIO_MASTER_GAIN = 1;
export const AUDIO_NOTE_ATTACK_S = 0.04;
export const AUDIO_NOTE_FLOOR_GAIN = 0.001;

// Re-exports for backward compatibility.
// New code should import directly from the grouped balance files below.
export * from './playerBalance';
export * from './enemyBalance';
export * from './bossBalance';
export * from './rewardBalance';
