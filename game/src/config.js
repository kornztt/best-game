// NEON SURGE — arena, palette, enemy and upgrade definitions.
// One clear job: every tunable number lives here, nowhere else.

export const ARENA = { width: 1280, height: 720 };

export const PALETTE = {
  background: '#05060f',
  grid: '#12162e',
  gridGlow: '#1c2450',
  border: '#2de2ff',
  player: '#00f0ff',
  playerCore: '#e8feff',
  bullet: '#ffe95e',
  bulletGlow: '#ffb52e',
  chaser: '#ff2d78',
  shooter: '#ff9f1c',
  splitter: '#39ff6a',
  mini: '#a4ff4f',
  darter: '#c86bff',
  boss: '#ff1744',
  eliteRing: '#ffffff',
  enemyBullet: '#ff5c5c',
  text: '#eaf6ff',
  muted: '#8fa3c8',
  danger: '#ff3b5c',
  upgradeCard: '#0d1330',
  upgradeBorder: '#2de2ff',
};

export const PLAYER = {
  radius: 14,
  speed: 300,
  maxHealth: 100,
  fireInterval: 0.16,
  bulletSpeed: 660,
  bulletDamage: 12,
  bulletRadius: 5,
  heatPerShot: 7,
  heatCoolRate: 34,
  overheatAt: 100,
  coolUntil: 30,
  contactDamage: 12,
  invulnerableSeconds: 0.7,
};

export const COMBO = {
  windowSeconds: 3.0,
  step: 0.1,
  cap: 2.0,
};

// Enemy kinds. hp scales a little with the wave (see world.js).
export const ENEMIES = {
  chaser: {
    kind: 'chaser',
    name: 'Chaser',
    color: PALETTE.chaser,
    radius: 16,
    hp: 22,
    speed: 125,
    score: 100,
    contactDamage: 10,
    sides: 3,
  },
  shooter: {
    kind: 'shooter',
    name: 'Shooter',
    color: PALETTE.shooter,
    radius: 18,
    hp: 34,
    speed: 72,
    score: 150,
    contactDamage: 10,
    fireInterval: 2.4,
    bulletSpeed: 240,
    sides: 4,
  },
  splitter: {
    kind: 'splitter',
    name: 'Splitter',
    color: PALETTE.splitter,
    radius: 25,
    hp: 46,
    speed: 82,
    score: 200,
    contactDamage: 12,
    sides: 6,
  },
  mini: {
    kind: 'mini',
    name: 'Shard',
    color: PALETTE.mini,
    radius: 9,
    hp: 9,
    speed: 185,
    score: 50,
    contactDamage: 6,
    sides: 3,
  },
  darter: {
    kind: 'darter',
    name: 'Darter',
    color: PALETTE.darter,
    radius: 14,
    hp: 28,
    speed: 95,
    score: 175,
    contactDamage: 12,
    sides: 5,
  },
  boss: {
    kind: 'boss',
    name: 'Overlord',
    color: PALETTE.boss,
    radius: 54,
    hp: 380,
    speed: 55,
    score: 1000,
    contactDamage: 22,
    fireInterval: 3.2,
    bulletSpeed: 210,
    sides: 8,
  },
};

/** Wave modifiers from wave 4: each wave leans into one enemy kind. */
export const MODIFIERS = ['SWARM', 'SNIPERS', 'SPLITTERS'];

export function waveModifier(wave) {
  if (wave % 5 === 0) return 'BOSS';
  if (wave < 4) return null;
  return MODIFIERS[wave % 3];
}

/** How many of each kind a wave fields, before the spawn budget trims it. */
export function waveComposition(wave, modifier = null) {
  const comp = {
    chaser: 4 + wave * 2,
    shooter: wave >= 2 ? 1 + Math.floor(wave / 2) : 0,
    splitter: wave >= 3 ? Math.floor((wave - 1) / 2) : 0,
    darter: wave >= 2 ? 1 + Math.floor(wave / 3) : 0,
    boss: modifier === 'BOSS' ? 1 : 0,
  };
  if (modifier === 'SWARM') comp.chaser += 5;
  else if (modifier === 'SNIPERS') comp.shooter += 3;
  else if (modifier === 'SPLITTERS') comp.splitter += 3;
  return comp;
}

/** Seconds between spawns inside a wave; waves get denser as they go on. */
export function spawnInterval(wave) {
  return Math.max(0.35, 1.1 - wave * 0.07);
}

export const UPGRADES = [
  {
    id: 'damage',
    name: 'OVERCHARGE',
    icon: '▲',
    blurb: '+35% bullet damage',
    apply: (p) => { p.bulletDamage *= 1.35; },
  },
  {
    id: 'rapid',
    name: 'RAPID CYCLER',
    icon: '≋',
    blurb: '+25% fire rate',
    apply: (p) => { p.fireInterval *= 0.8; },
  },
  {
    id: 'swift',
    name: 'ION THRUSTERS',
    icon: '»',
    blurb: '+15% move speed',
    apply: (p) => { p.speed *= 1.15; },
  },
  {
    id: 'aegis',
    name: 'AEGIS PLATING',
    icon: '⬢',
    blurb: '+40 max health, heal 40',
    apply: (p) => {
      p.maxHealth += 40;
      p.health = Math.min(p.maxHealth, p.health + 40);
    },
  },
  {
    id: 'split',
    name: 'TRI-SHOT',
    icon: '✦',
    blurb: '+1 projectile per shot',
    apply: (p) => { p.projectiles = Math.min(5, (p.projectiles || 1) + 1); },
  },
  {
    id: 'pierce',
    name: 'PIERCING ROUNDS',
    icon: '➶',
    blurb: 'bullets pierce +1 enemy',
    apply: (p) => { p.pierce = Math.min(3, (p.pierce || 0) + 1); },
  },
  {
    id: 'regen',
    name: 'NANOBOT SWARM',
    icon: '✚',
    blurb: 'regenerate +1.5 hull / sec',
    apply: (p) => { p.regen = (p.regen || 0) + 1.5; },
  },
  {
    id: 'coolant',
    name: 'CRYO COOLANT',
    icon: '❄',
    blurb: '-35% heat per shot, cool 50% faster',
    apply: (p) => {
      p.heatPerShot = (p.heatPerShot || 7) * 0.65;
      p.coolRate = (p.coolRate || 34) * 1.5;
    },
  },
  {
    id: 'shrapnel',
    name: 'SHRAPNEL CORE',
    icon: '✹',
    blurb: 'kills detonate, 30 damage nearby',
    apply: (p) => { p.shrapnel = true; },
  },
];

/** Pick 3 distinct upgrades for the between-wave choice. */
export function rollUpgrades(rng) {
  const pool = [...UPGRADES];
  const picked = [];
  while (picked.length < 3 && pool.length > 0) {
    picked.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  }
  return picked;
}
