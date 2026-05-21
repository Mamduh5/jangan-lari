// Visual feedback
export const PLAYER_HIT_SHAKE_DURATION_MS = 90;
export const PLAYER_HIT_SHAKE_INTENSITY = 0.0032;

// Audio
export const AUDIO_MASTER_GAIN = 1;
export const AUDIO_NOTE_ATTACK_S = 0.04;
export const AUDIO_NOTE_FLOOR_GAIN = 0.001;

// Re-exports for backward compatibility.
// New code should import directly from the grouped balance files below.
export * from './worldBalance';
export * from './playerBalance';
export * from './enemyBalance';
export * from './bossBalance';
export * from './rewardBalance';
