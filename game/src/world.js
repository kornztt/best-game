// Game state and rules. One clear job: own the world — waves, spawning,
// movement, shooting, collisions, upgrades, score and game over — and step
// it forward one fixed tick at a time.

import { ARENA, PLAYER, COMBO, ENEMIES, waveComposition, waveModifier, spawnInterval, rollUpgrades } from './config.js';
import { makeRng, range } from './random.js';
import { makeChaser, makeShooter, makeSplitter, makeMini, makeDarter, makeBoss, makeBullet, makeRing, burst, makeFloatText } from './entities.js';
import { moveVector } from './input.js';
import { sfx } from './audio.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_UPGRADE = 'upgrade';
export const SCREEN_OVER = 'over';
export const SCREEN_PAUSED = 'paused';

const STEP = 1 / 60;
const BEST_KEY = 'neon-surge-best';

export function loadBest() {
  try {
    return Number(window.localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

export function saveBest(score) {
  try {
    window.localStorage.setItem(BEST_KEY, String(score));
  } catch {
    /* storage unavailable: best score just isn't kept */
  }
}

export function createWorld(seed = 1) {
  const rng = makeRng(seed);
  return {
    rng,
    seed,
    screen: SCREEN_TITLE,
    time: 0,
    player: freshPlayer(),
    enemies: [],
    bullets: [],
    enemyBullets: [],
    particles: [],
    rings: [],
    texts: [],
    stars: makeStars(rng),
    wave: 0,
    modifier: null,
    spawnQueue: [],
    spawnTimer: 0,
    betweenWaves: false,
    waveBanner: 0,
    waveBannerText: '',
    score: 0,
    best: loadBest(),
    kills: 0,
    combo: 0,
    comboTimer: 0,
    comboBest: 0,
    shake: 0,
    flash: 0,
    offered: [],
    muted: false,
    stats: { shotsFired: 0, shotsHit: 0 },
  };
}

function freshPlayer() {
  return {
    x: ARENA.width / 2,
    y: ARENA.height / 2,
    angle: -Math.PI / 2,
    radius: PLAYER.radius,
    speed: PLAYER.speed,
    health: PLAYER.maxHealth,
    maxHealth: PLAYER.maxHealth,
    fireInterval: PLAYER.fireInterval,
    bulletSpeed: PLAYER.bulletSpeed,
    bulletDamage: PLAYER.bulletDamage,
    projectiles: 1,
    pierce: 0,
    regen: 0,
    heatPerShot: PLAYER.heatPerShot,
    coolRate: PLAYER.heatCoolRate,
    shrapnel: false,
    heat: 0,
    overheated: false,
    fireTimer: 0,
    invulnerable: 0,
    alive: true,
  };
}

function makeStars(rng) {
  const stars = [];
  for (let i = 0; i < 90; i += 1) {
    stars.push({
      x: rng() * ARENA.width,
      y: rng() * ARENA.height,
      size: 0.5 + rng() * 1.6,
      twinkle: rng() * Math.PI * 2,
    });
  }
  return stars;
}

export function startRun(world) {
  const seed = world.seed;
  const fresh = createWorld(seed);
  Object.keys(fresh).forEach((k) => { world[k] = fresh[k]; });
  world.screen = SCREEN_PLAY;
  startWave(world);
}

export function startWave(world) {
  world.wave += 1;
  world.screen = SCREEN_PLAY;
  const modifier = waveModifier(world.wave);
  world.modifier = modifier;
  const comp = waveComposition(world.wave, modifier);
  world.spawnQueue = [];
  for (let i = 0; i < comp.chaser; i += 1) world.spawnQueue.push('chaser');
  for (let i = 0; i < comp.shooter; i += 1) world.spawnQueue.push('shooter');
  for (let i = 0; i < comp.splitter; i += 1) world.spawnQueue.push('splitter');
  for (let i = 0; i < comp.darter; i += 1) world.spawnQueue.push('darter');
  for (let i = 0; i < comp.boss; i += 1) world.spawnQueue.push('boss');
  shuffle(world.rng, world.spawnQueue);
  world.spawnTimer = 0.5;
  world.betweenWaves = false;
  world.waveBanner = 2.2;
  world.waveBannerText = modifier ? `WAVE ${world.wave} — ${modifier}` : `WAVE ${world.wave}`;
  if (modifier === 'BOSS') sfx.boss();
  else sfx.waveStart();
}

function shuffle(rng, list) {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
}

function spawnEdgePosition(world) {
  const side = Math.floor(world.rng() * 4);
  const m = 30;
  if (side === 0) return { x: range(world.rng, m, ARENA.width - m), y: m };
  if (side === 1) return { x: range(world.rng, m, ARENA.width - m), y: ARENA.height - m };
  if (side === 2) return { x: m, y: range(world.rng, m, ARENA.height - m) };
  return { x: ARENA.width - m, y: range(world.rng, m, ARENA.height - m) };
}

function spawnEnemy(world, kind) {
  const pos = spawnEdgePosition(world);
  const hpScale = 1 + (world.wave - 1) * 0.08;
  let enemy = null;
  if (kind === 'chaser') enemy = makeChaser(pos.x, pos.y, hpScale);
  else if (kind === 'shooter') {
    enemy = makeShooter(pos.x, pos.y, hpScale);
    enemy.fireTimer = 1.0 + world.rng() * 1.5;
  } else if (kind === 'splitter') enemy = makeSplitter(pos.x, pos.y, hpScale);
  else if (kind === 'darter') enemy = makeDarter(pos.x, pos.y, hpScale);
  else if (kind === 'boss') enemy = makeBoss(pos.x, pos.y, hpScale);
  if (enemy) {
    // Elites from wave 4: tougher, faster, worth double. Never the boss.
    if (world.wave >= 4 && kind !== 'boss' && world.rng() < 0.12) {
      enemy.elite = true;
      enemy.hp = Math.round(enemy.hp * 2.2);
      enemy.maxHp = enemy.hp;
      enemy.speed *= 1.15;
      enemy.score *= 2;
    }
    enemy.angle = Math.atan2(world.player.y - enemy.y, world.player.x - enemy.x);
    world.enemies.push(enemy);
    world.particles.push(...burst(enemy.x, enemy.y, enemy.color, 10, 120, 0.5, 2.5));
  }
}

function firePlayerBullets(world) {
  const p = world.player;
  const count = p.projectiles;
  const spread = 0.14;
  const baseAngle = p.angle;
  for (let i = 0; i < count; i += 1) {
    const offset = (i - (count - 1) / 2) * spread;
    const angle = baseAngle + offset;
    const nx = p.x + Math.cos(angle) * (p.radius + 8);
    const ny = p.y + Math.sin(angle) * (p.radius + 8);
    const b = makeBullet(nx, ny, angle, p.bulletSpeed, p.bulletDamage, true);
    b.pierceLeft = p.pierce || 0;
    b.hitIds = new Set();
    world.bullets.push(b);
    // Muzzle flash: a few bright sparks at the gun's nose.
    if (i === 0) world.particles.push(...burst(nx, ny, '#ffe95e', 4, 220, 0.12, 2.5));
  }
  p.heat += p.heatPerShot;
  if (p.heat >= PLAYER.overheatAt) {
    p.overheated = true;
    sfx.overheat();
  }
  world.stats.shotsFired += 1;
  sfx.shoot();
}

function damagePlayer(world, amount) {
  const p = world.player;
  if (p.invulnerable > 0 || !p.alive) return;
  p.health -= amount;
  p.invulnerable = PLAYER.invulnerableSeconds;
  world.shake = Math.max(world.shake, 10);
  world.flash = 0.25;
  world.combo = 0;
  world.comboTimer = 0;
  world.particles.push(...burst(p.x, p.y, '#ff3b5c', 16, 220, 0.6, 3));
  sfx.hurt();
  if (p.health <= 0) {
    p.health = 0;
    p.alive = false;
    world.particles.push(...burst(p.x, p.y, '#00f0ff', 60, 320, 1.0, 4));
    world.particles.push(...burst(p.x, p.y, '#ffffff', 30, 200, 0.8, 3));
    world.rings.push(makeRing(p.x, p.y, '#00f0ff', 220, 0.9));
    world.shake = 18;
    sfx.explode(true);
    sfx.gameOver();
    endRun(world);
  }
}

function endRun(world) {
  world.screen = SCREEN_OVER;
  if (world.score > world.best) {
    world.best = world.score;
    saveBest(world.score);
  }
}

function killEnemy(world, enemy) {
  enemy.dead = true;
  world.kills += 1;
  world.combo += 1;
  world.comboTimer = COMBO.windowSeconds;
  world.comboBest = Math.max(world.comboBest, world.combo);
  const mult = 1 + Math.min(world.combo, 20) * COMBO.step;
  const gained = Math.round(enemy.score * mult);
  world.score += gained;
  world.texts.push(makeFloatText(enemy.x, enemy.y - 10, `+${gained}`, '#ffe95e', enemy.score >= 150 ? 20 : 16));
  world.particles.push(...burst(enemy.x, enemy.y, enemy.color, enemy.kind === 'splitter' ? 26 : 16, 240, 0.7, 3.5));
  world.shake = Math.max(world.shake, enemy.kind === 'splitter' ? 7 : 4);
  sfx.explode(enemy.kind === 'splitter');
  if (enemy.kind === 'splitter') {
    world.rings.push(makeRing(enemy.x, enemy.y, enemy.color, 90, 0.5));
    const a = world.rng() * Math.PI * 2;
    world.enemies.push(makeMini(enemy.x, enemy.y, a));
    world.enemies.push(makeMini(enemy.x, enemy.y, a + Math.PI));
  }
  if (enemy.kind === 'boss') {
    world.rings.push(makeRing(enemy.x, enemy.y, '#ff1744', 280, 0.9));
    world.rings.push(makeRing(enemy.x, enemy.y, '#ffffff', 180, 0.7));
    world.particles.push(...burst(enemy.x, enemy.y, '#ff1744', 50, 380, 1.0, 4));
    world.shake = 20;
    // The boss drops hull: killing it patches the ship up.
    const p = world.player;
    p.health = Math.min(p.maxHealth, p.health + 30);
    world.texts.push(makeFloatText(p.x, p.y - 24, '+30 HULL', '#39ff6a', 18));
  }
  // Shrapnel core: the kill detonates and hurts everything nearby.
  if (world.player.shrapnel) {
    const targets = world.enemies.filter((e) => !e.dead && e !== enemy
      && (e.x - enemy.x) ** 2 + (e.y - enemy.y) ** 2 < 100 * 100);
    world.rings.push(makeRing(enemy.x, enemy.y, '#ffb52e', 100, 0.4));
    for (const t of targets) {
      t.hp -= 30;
      t.flash = 0.09;
      if (t.hp <= 0) killEnemy(world, t);
    }
  }
}

function offerUpgrades(world) {
  world.offered = rollUpgrades(world.rng);
  world.screen = SCREEN_UPGRADE;
}

export function applyUpgrade(world, index) {
  const up = world.offered[index];
  if (!up) return;
  up.apply(world.player);
  world.offered = [];
  sfx.upgrade();
  world.particles.push(...burst(world.player.x, world.player.y, '#2de2ff', 30, 260, 0.8, 3));
  startWave(world);
}

function collide(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const r = a.radius + b.radius;
  return dx * dx + dy * dy < r * r;
}

function clampToArena(e, margin) {
  e.x = Math.max(margin, Math.min(ARENA.width - margin, e.x));
  e.y = Math.max(margin, Math.min(ARENA.height - margin, e.y));
}

/** Advance the world one fixed step. `input` may be null for staged scenes. */
export function stepWorld(world, dt, input) {
  world.time += dt;
  if (world.shake > 0) world.shake = Math.max(0, world.shake - dt * 30);
  if (world.flash > 0) world.flash = Math.max(0, world.flash - dt);
  if (world.waveBanner > 0) world.waveBanner = Math.max(0, world.waveBanner - dt);

  for (const s of world.stars) s.twinkle += dt * 2;

  // Particles and floating text always animate.
  for (const pt of world.particles) {
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= 1 - 2.4 * dt;
    pt.vy *= 1 - 2.4 * dt;
    pt.life -= dt;
    if (pt.life <= 0) pt.dead = true;
  }
  world.particles = world.particles.filter((p) => !p.dead);
  for (const t of world.texts) {
    t.y -= 34 * dt;
    t.life -= dt;
    if (t.life <= 0) t.dead = true;
  }
  world.texts = world.texts.filter((t) => !t.dead);
  for (const r of world.rings) {
    r.radius += (r.maxRadius - r.radius) * 6 * dt + 40 * dt;
    r.life -= dt;
    if (r.life <= 0) r.dead = true;
  }
  world.rings = world.rings.filter((r) => !r.dead);

  if (world.screen !== SCREEN_PLAY) return;
  const p = world.player;
  if (!p.alive) return;

  // Combo decay.
  if (world.comboTimer > 0) {
    world.comboTimer -= dt;
    if (world.comboTimer <= 0) world.combo = 0;
  }

  // Movement + aim. Touch joystick overrides keys; a right-half touch
  // aims and auto-fires. (Staged fake inputs have neither field.)
  const joy = input && input.joy && input.joy.active ? input.joy : null;
  const touchAim = input && input.touchAim && input.touchAim.active ? input.touchAim : null;
  if (input) {
    const mv = joy ? { x: joy.x, y: joy.y } : moveVector(input);
    p.x += mv.x * p.speed * dt;
    p.y += mv.y * p.speed * dt;
    const ax = touchAim ? touchAim.x : input.mouseX;
    const ay = touchAim ? touchAim.y : input.mouseY;
    p.angle = Math.atan2(ay - p.y, ax - p.x);
  }
  clampToArena(p, p.radius + 6);
  if (p.invulnerable > 0) p.invulnerable -= dt;

  // Nanobot regeneration, if bought.
  if (p.regen > 0) p.health = Math.min(p.maxHealth, p.health + p.regen * dt);

  // Heat.
  p.heat = Math.max(0, p.heat - p.coolRate * dt);
  if (p.overheated && p.heat <= PLAYER.coolUntil) p.overheated = false;

  // Shooting.
  p.fireTimer -= dt;
  const firing = input && (input.mouseDown || !!touchAim);
  if (firing && !p.overheated && p.fireTimer <= 0) {
    firePlayerBullets(world);
    p.fireTimer = p.fireInterval;
  }

  // Spawning.
  if (world.spawnQueue.length > 0) {
    world.spawnTimer -= dt;
    if (world.spawnTimer <= 0) {
      spawnEnemy(world, world.spawnQueue.shift());
      world.spawnTimer = spawnInterval(world.wave);
    }
  } else if (world.enemies.length === 0 && !world.betweenWaves) {
    world.betweenWaves = true;
    offerUpgrades(world);
    return;
  }

  // Enemies.
  for (const e of world.enemies) {
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    e.angle = Math.atan2(dy, dx);
    e.spin += dt;
    if (e.flash > 0) e.flash -= dt;
    if (e.kind === 'chaser' || e.kind === 'splitter') {
      e.vx = (dx / dist) * e.speed;
      e.vy = (dy / dist) * e.speed;
    } else if (e.kind === 'darter') {
      // Roam toward the player, telegraph (flash, hold still), then dash.
      e.modeTimer -= dt;
      if (e.mode === 'roam') {
        e.vx = (dx / dist) * e.speed;
        e.vy = (dy / dist) * e.speed;
        if (e.modeTimer <= 0) { e.mode = 'aim'; e.modeTimer = 0.5; }
      } else if (e.mode === 'aim') {
        e.vx = 0;
        e.vy = 0;
        e.flash = 0.1;
        if (e.modeTimer <= 0) {
          e.mode = 'dash';
          e.modeTimer = 0.45;
          e.dashX = dx / dist;
          e.dashY = dy / dist;
          sfx.dash();
        }
      } else {
        e.vx = e.dashX * 520;
        e.vy = e.dashY * 520;
        if (e.modeTimer <= 0) { e.mode = 'roam'; e.modeTimer = 1.2 + world.rng() * 1.2; }
      }
    } else if (e.kind === 'boss') {
      // Slow chase, with a radial bullet burst every few seconds.
      e.vx = (dx / dist) * e.speed;
      e.vy = (dy / dist) * e.speed;
      e.fireTimer -= dt;
      if (e.fireTimer <= 0) {
        e.fireTimer = e.fireInterval;
        const n = 10;
        for (let i = 0; i < n; i += 1) {
          const a = (i / n) * Math.PI * 2 + world.time * 0.3;
          world.enemyBullets.push(makeBullet(e.x, e.y, a, e.bulletSpeed, 10, false, 6));
        }
        world.particles.push(...burst(e.x, e.y, '#ff1744', 20, 260, 0.5, 3));
        sfx.bossShoot();
      }
    } else if (e.kind === 'mini') {
      // Shards drift, then steer gently toward the player.
      e.vx += (dx / dist) * 260 * dt;
      e.vy += (dy / dist) * 260 * dt;
      const sp = Math.hypot(e.vx, e.vy);
      const cap = e.speed * 1.25;
      if (sp > cap) {
        e.vx = (e.vx / sp) * cap;
        e.vy = (e.vy / sp) * cap;
      }
    } else if (e.kind === 'shooter') {
      // Keep a standoff distance and strafe.
      const want = 260;
      const toward = dist > want + 40 ? 1 : dist < want - 40 ? -1 : 0;
      e.vx = (dx / dist) * e.speed * toward + Math.cos(world.time * 0.9 + e.id) * 40;
      e.vy = (dy / dist) * e.speed * toward + Math.sin(world.time * 0.9 + e.id) * 40;
      e.fireTimer -= dt;
      if (e.fireTimer <= 0 && dist < 560) {
        e.fireTimer = e.fireInterval * (0.9 + world.rng() * 0.3);
        const aim = Math.atan2(dy, dx) + (world.rng() - 0.5) * 0.12;
        world.enemyBullets.push(makeBullet(e.x, e.y, aim, e.bulletSpeed, 8, false, 6));
      }
    }
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    clampToArena(e, e.radius);
    if (collide(e, p)) {
      damagePlayer(world, e.contactDamage);
      // Knock the enemy back so one touch is not a multi-hit.
      e.x -= (dx / dist) * 26;
      e.y -= (dy / dist) * 26;
      if (!p.alive) return;
    }
  }

  // Player bullets.
  for (const b of world.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0 || b.x < -20 || b.x > ARENA.width + 20 || b.y < -20 || b.y > ARENA.height + 20) {
      b.dead = true;
      continue;
    }
    for (const e of world.enemies) {
      if (e.dead) continue;
      if (b.hitIds && b.hitIds.has(e.id)) continue;
      if (collide(b, e)) {
        e.hp -= b.damage;
        e.flash = 0.09;
        world.stats.shotsHit += 1;
        world.particles.push(...burst(b.x, b.y, '#ffe95e', 4, 140, 0.3, 2));
        if (e.hp <= 0) killEnemy(world, e);
        else sfx.hit();
        if (b.hitIds) b.hitIds.add(e.id);
        if (b.pierceLeft > 0) {
          b.pierceLeft -= 1;
          // Piercing rounds keep flying to the next enemy.
        } else {
          b.dead = true;
          break;
        }
      }
    }
  }
  world.bullets = world.bullets.filter((b) => !b.dead);

  // Enemy bullets.
  for (const b of world.enemyBullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0 || b.x < -20 || b.x > ARENA.width + 20 || b.y < -20 || b.y > ARENA.height + 20) {
      b.dead = true;
      continue;
    }
    if (collide(b, p)) {
      b.dead = true;
      damagePlayer(world, b.damage);
      if (!p.alive) return;
    }
  }
  world.enemyBullets = world.enemyBullets.filter((b) => !b.dead);
  world.enemies = world.enemies.filter((e) => !e.dead);
}

export { STEP };
