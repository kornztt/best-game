// Entity factories. One clear job: build the plain objects the world moves
// around — enemies, bullets, particles, floating score text.

import { ENEMIES } from './config.js';

let nextId = 1;

function base(kind, x, y) {
  return { id: nextId, kind, x, y, vx: 0, vy: 0, angle: 0, spin: 0, hp: 1, radius: 8, score: 0, dead: false };
}

export function makeChaser(x, y, hpScale) {
  const def = ENEMIES.chaser;
  const e = base('chaser', x, y);
  e.radius = def.radius;
  e.hp = Math.round(def.hp * hpScale);
  e.maxHp = e.hp;
  e.speed = def.speed;
  e.score = def.score;
  e.contactDamage = def.contactDamage;
  e.sides = def.sides;
  e.color = def.color;
  return e;
}

export function makeShooter(x, y, hpScale) {
  const def = ENEMIES.shooter;
  const e = base('shooter', x, y);
  e.radius = def.radius;
  e.hp = Math.round(def.hp * hpScale);
  e.maxHp = e.hp;
  e.speed = def.speed;
  e.score = def.score;
  e.contactDamage = def.contactDamage;
  e.sides = def.sides;
  e.color = def.color;
  e.fireTimer = 1.2 + Math.random() * 1.2;
  e.fireInterval = def.fireInterval;
  e.bulletSpeed = def.bulletSpeed;
  return e;
}

export function makeSplitter(x, y, hpScale) {
  const def = ENEMIES.splitter;
  const e = base('splitter', x, y);
  e.radius = def.radius;
  e.hp = Math.round(def.hp * hpScale);
  e.maxHp = e.hp;
  e.speed = def.speed;
  e.score = def.score;
  e.contactDamage = def.contactDamage;
  e.sides = def.sides;
  e.color = def.color;
  return e;
}

export function makeDarter(x, y, hpScale) {
  const def = ENEMIES.darter;
  const e = base('darter', x, y);
  e.radius = def.radius;
  e.hp = Math.round(def.hp * hpScale);
  e.maxHp = e.hp;
  e.speed = def.speed;
  e.score = def.score;
  e.contactDamage = def.contactDamage;
  e.sides = def.sides;
  e.color = def.color;
  e.mode = 'roam';
  e.modeTimer = 1.0 + Math.random() * 1.2;
  e.dashX = 0;
  e.dashY = 0;
  return e;
}

export function makeBoss(x, y, hpScale) {
  const def = ENEMIES.boss;
  const e = base('boss', x, y);
  e.radius = def.radius;
  e.hp = Math.round(def.hp * hpScale);
  e.maxHp = e.hp;
  e.speed = def.speed;
  e.score = def.score;
  e.contactDamage = def.contactDamage;
  e.sides = def.sides;
  e.color = def.color;
  e.fireTimer = 2.0;
  e.fireInterval = def.fireInterval;
  e.bulletSpeed = def.bulletSpeed;
  return e;
}

export function makeMini(x, y, angle) {
  const def = ENEMIES.mini;
  const e = base('mini', x, y);
  e.radius = def.radius;
  e.hp = def.hp;
  e.maxHp = e.hp;
  e.speed = def.speed;
  e.score = def.score;
  e.contactDamage = def.contactDamage;
  e.sides = def.sides;
  e.color = def.color;
  e.vx = Math.cos(angle) * e.speed;
  e.vy = Math.sin(angle) * e.speed;
  return e;
}

export function makeBullet(x, y, angle, speed, damage, friendly, radius = 5) {
  return {
    id: nextId,
    kind: friendly ? 'bullet' : 'enemyBullet',
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius,
    damage,
    friendly,
    dead: false,
    life: 2.5,
    pierceLeft: 0,
    hitIds: null,
  };
}

/** An expanding shockwave ring, drawn as a stroked circle that fades. */
export function makeRing(x, y, color, maxRadius, life = 0.6) {
  return { x, y, color, radius: 8, maxRadius, life, maxLife: life, dead: false };
}

export function makeParticle(x, y, color, speed, life, size) {
  const angle = Math.random() * Math.PI * 2;
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    color,
    life,
    maxLife: life,
    size,
    dead: false,
  };
}

export function burst(x, y, color, count, speed, life = 0.6, size = 3) {
  const out = [];
  for (let i = 0; i < count; i += 1) out.push(makeParticle(x, y, color, speed * (0.3 + Math.random() * 0.7), life * (0.6 + Math.random() * 0.6), size * (0.6 + Math.random() * 0.8)));
  return out;
}

export function makeFloatText(x, y, text, color, size = 16) {
  return { x, y, text, color, size, life: 0.9, maxLife: 0.9, dead: false };
}
