export type WeaponDefinition = {
  id: string;
  name: string;
  damage: number;
  fireCooldownMs: number;
  projectileSpeed: number;
  range: number;
  projectileRadius: number;
  projectileColor: number;
};

export const STARTER_WEAPON: WeaponDefinition = {
  id: 'arc-bolt',
  name: 'Arc Bolt',
  damage: 18,
  fireCooldownMs: 420,
  projectileSpeed: 560,
  range: 360,
  projectileRadius: 5,
  projectileColor: 0xfacc15,
};
