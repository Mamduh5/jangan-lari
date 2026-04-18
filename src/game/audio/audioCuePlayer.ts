import { AUDIO_MASTER_GAIN, AUDIO_NOTE_ATTACK_S, AUDIO_NOTE_FLOOR_GAIN } from '../config/constants';
import type { HeroDefinition } from '../data/heroes';
import type { WeaponDefinition } from '../data/weapons';

type CueKind =
  | 'dash-warning'
  | 'elite-arrival'
  | 'miniboss-arrival'
  | 'boss-arrival'
  | 'miniboss-release'
  | 'boss-release'
  | 'elite-reward'
  | 'miniboss-reward'
  | 'boss-reward'
  | 'upgrade-confirm'
  | 'victory'
  | 'defeat';

type WeaponCueCategory = 'rapid' | 'heavy' | 'radial' | 'piercing' | 'explosive' | 'default';

const audioState = {
  context: null as AudioContext | null,
  masterGain: null as GainNode | null,
  lastWeaponCueAt: new Map<WeaponCueCategory, number>(),
};

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const AudioContextCtor = window.AudioContext ?? (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) {
    return null;
  }

  if (!audioState.context) {
    try {
      audioState.context = new AudioContextCtor();
      audioState.masterGain = audioState.context.createGain();
      audioState.masterGain.gain.value = AUDIO_MASTER_GAIN;
      audioState.masterGain.connect(audioState.context.destination);
    } catch {
      return null;
    }
  }

  return audioState.context;
}

export function primeAudioContext(): void {
  const context = getAudioContext();
  if (!context || !audioState.masterGain) {
    return;
  }

  if (context.state === 'suspended') {
    void context.resume().catch(() => {});
  }

  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(220, now);
  gain.gain.setValueAtTime(AUDIO_NOTE_FLOOR_GAIN, now);
  gain.gain.exponentialRampToValueAtTime(AUDIO_NOTE_FLOOR_GAIN, now + 0.02);

  oscillator.connect(gain);
  gain.connect(audioState.masterGain);
  oscillator.start(now);
  oscillator.stop(now + 0.02);
}

export function playHeroIntroCue(hero: HeroDefinition, weapon: WeaponDefinition): void {
  const baseNote = hero.id === 'shade' ? 392 : hero.id === 'verdant' ? 330 : hero.id === 'vanguard' ? 247 : 294;
  const accent = weapon.firePattern === 'radial' ? 1.5 : weapon.explosionRadius ? 1.2 : weapon.pierceCount ? 1.35 : 1.8;
  playToneSequence([
    { frequency: baseNote, startOffset: 0, duration: 0.08, type: 'triangle', gain: 0.28 },
    { frequency: baseNote * accent, startOffset: 0.09, duration: 0.11, type: 'sine', gain: 0.24 },
    { frequency: baseNote * 2.02, startOffset: 0.21, duration: 0.14, type: 'triangle', gain: 0.2 },
  ]);
}

export function playWeaponFireCue(weapon: WeaponDefinition): void {
  const category = getWeaponCueCategory(weapon);
  const context = getAudioContext();
  if (!context || !audioState.masterGain) {
    return;
  }

  if (context.state === 'suspended') {
    return;
  }

  const nowMs = performance.now();
  const minSpacingMs =
    category === 'rapid'
      ? 85
      : category === 'radial'
        ? 220
        : category === 'heavy'
          ? 180
          : category === 'explosive'
            ? 220
            : 120;

  const lastAt = audioState.lastWeaponCueAt.get(category) ?? -Infinity;
  if (nowMs - lastAt < minSpacingMs) {
    return;
  }
  audioState.lastWeaponCueAt.set(category, nowMs);

  switch (category) {
    case 'rapid':
      playToneSequence([
        { frequency: 720, startOffset: 0, duration: 0.035, type: 'square', gain: 0.12 },
        { frequency: 810, startOffset: 0.03, duration: 0.03, type: 'square', gain: 0.1 },
      ]);
      break;
    case 'heavy':
      playToneSequence([
        { frequency: 180, startOffset: 0, duration: 0.08, type: 'sawtooth', gain: 0.2 },
        { frequency: 120, startOffset: 0.02, duration: 0.12, type: 'triangle', gain: 0.12 },
      ]);
      break;
    case 'radial':
      playToneSequence([
        { frequency: 420, startOffset: 0, duration: 0.05, type: 'triangle', gain: 0.14 },
        { frequency: 620, startOffset: 0.03, duration: 0.09, type: 'sine', gain: 0.12 },
      ]);
      break;
    case 'piercing':
      playToneSequence([
        { frequency: 510, startOffset: 0, duration: 0.06, type: 'sawtooth', gain: 0.14 },
        { frequency: 680, startOffset: 0.025, duration: 0.05, type: 'triangle', gain: 0.1 },
      ]);
      break;
    case 'explosive':
      playToneSequence([
        { frequency: 240, startOffset: 0, duration: 0.07, type: 'triangle', gain: 0.16 },
        { frequency: 430, startOffset: 0.05, duration: 0.04, type: 'square', gain: 0.08 },
      ]);
      break;
    default:
      playToneSequence([{ frequency: 520, startOffset: 0, duration: 0.045, type: 'triangle', gain: 0.11 }]);
      break;
  }
}

export function playCue(kind: CueKind): void {
  switch (kind) {
    case 'dash-warning':
      playToneSequence([
        { frequency: 240, startOffset: 0, duration: 0.09, type: 'sawtooth', gain: 0.18 },
        { frequency: 320, startOffset: 0.08, duration: 0.09, type: 'sawtooth', gain: 0.16 },
      ]);
      break;
    case 'elite-arrival':
      playToneSequence([
        { frequency: 277.18, startOffset: 0, duration: 0.12, type: 'triangle', gain: 0.18 },
        { frequency: 369.99, startOffset: 0.09, duration: 0.12, type: 'sawtooth', gain: 0.14 },
      ]);
      break;
    case 'miniboss-arrival':
      playToneSequence([
        { frequency: 196, startOffset: 0, duration: 0.18, type: 'triangle', gain: 0.24 },
        { frequency: 247, startOffset: 0.14, duration: 0.18, type: 'sawtooth', gain: 0.18 },
      ]);
      break;
    case 'boss-arrival':
      playToneSequence([
        { frequency: 130.81, startOffset: 0, duration: 0.26, type: 'sawtooth', gain: 0.28 },
        { frequency: 164.81, startOffset: 0.16, duration: 0.2, type: 'triangle', gain: 0.22 },
        { frequency: 110, startOffset: 0.33, duration: 0.32, type: 'sawtooth', gain: 0.2 },
      ]);
      break;
    case 'miniboss-release':
      playToneSequence([
        { frequency: 220, startOffset: 0, duration: 0.08, type: 'square', gain: 0.22 },
        { frequency: 140, startOffset: 0.03, duration: 0.12, type: 'sawtooth', gain: 0.16 },
      ]);
      break;
    case 'boss-release':
      playToneSequence([
        { frequency: 92, startOffset: 0, duration: 0.14, type: 'triangle', gain: 0.26 },
        { frequency: 160, startOffset: 0.06, duration: 0.18, type: 'sawtooth', gain: 0.16 },
      ]);
      break;
    case 'elite-reward':
      playToneSequence([
        { frequency: 523.25, startOffset: 0, duration: 0.06, type: 'triangle', gain: 0.16 },
        { frequency: 659.25, startOffset: 0.05, duration: 0.08, type: 'triangle', gain: 0.14 },
      ]);
      break;
    case 'miniboss-reward':
      playToneSequence([
        { frequency: 392, startOffset: 0, duration: 0.08, type: 'triangle', gain: 0.18 },
        { frequency: 523.25, startOffset: 0.06, duration: 0.09, type: 'triangle', gain: 0.16 },
        { frequency: 659.25, startOffset: 0.13, duration: 0.12, type: 'sine', gain: 0.14 },
      ]);
      break;
    case 'boss-reward':
    case 'victory':
      playToneSequence([
        { frequency: 392, startOffset: 0, duration: 0.09, type: 'triangle', gain: 0.2 },
        { frequency: 523.25, startOffset: 0.08, duration: 0.1, type: 'triangle', gain: 0.18 },
        { frequency: 783.99, startOffset: 0.18, duration: 0.18, type: 'sine', gain: 0.16 },
      ]);
      break;
    case 'upgrade-confirm':
      playToneSequence([
        { frequency: 659.25, startOffset: 0, duration: 0.05, type: 'triangle', gain: 0.15 },
        { frequency: 783.99, startOffset: 0.04, duration: 0.06, type: 'triangle', gain: 0.14 },
        { frequency: 987.77, startOffset: 0.09, duration: 0.09, type: 'sine', gain: 0.12 },
      ]);
      break;
    case 'defeat':
      playToneSequence([
        { frequency: 220, startOffset: 0, duration: 0.1, type: 'sawtooth', gain: 0.18 },
        { frequency: 174.61, startOffset: 0.09, duration: 0.12, type: 'triangle', gain: 0.16 },
        { frequency: 130.81, startOffset: 0.2, duration: 0.18, type: 'triangle', gain: 0.14 },
      ]);
      break;
  }
}

function getWeaponCueCategory(weapon: WeaponDefinition): WeaponCueCategory {
  if (weapon.explosionRadius) {
    return 'explosive';
  }

  if (weapon.firePattern === 'radial') {
    return 'radial';
  }

  if (weapon.pierceCount) {
    return 'piercing';
  }

  if (weapon.fireCooldownMs >= 900 || weapon.damage >= 28) {
    return 'heavy';
  }

  if ((weapon.burstCount ?? 1) >= 2 && weapon.fireCooldownMs <= 650) {
    return 'rapid';
  }

  return 'default';
}

function playToneSequence(
  notes: Array<{
    frequency: number;
    startOffset: number;
    duration: number;
    type: OscillatorType;
    gain: number;
  }>,
): void {
  const context = getAudioContext();
  if (!context || !audioState.masterGain) {
    return;
  }

  if (context.state === 'suspended') {
    return;
  }

  const baseTime = context.currentTime + 0.001;

  for (const note of notes) {
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    const filter = context.createBiquadFilter();

    oscillator.type = note.type;
    oscillator.frequency.setValueAtTime(note.frequency, baseTime + note.startOffset);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.max(420, note.frequency * 4.2), baseTime + note.startOffset);

    gainNode.gain.setValueAtTime(AUDIO_NOTE_FLOOR_GAIN, baseTime + note.startOffset);
    gainNode.gain.exponentialRampToValueAtTime(
      note.gain,
      baseTime + note.startOffset + Math.min(AUDIO_NOTE_ATTACK_S, note.duration * 0.35),
    );
    gainNode.gain.exponentialRampToValueAtTime(AUDIO_NOTE_FLOOR_GAIN, baseTime + note.startOffset + note.duration);

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioState.masterGain);

    oscillator.start(baseTime + note.startOffset);
    oscillator.stop(baseTime + note.startOffset + note.duration + 0.02);
  }
}
