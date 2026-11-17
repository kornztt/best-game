// Screenshot scenes behind ?shot=title|play|upgrade|over. Each one plays the
// real rules forward from a fresh world for a fixed time, steered by a simple
// autopilot (kite away from the nearest enemy, aim at it, keep firing), so
// the frame is what a short game really looks like and the same seed always
// stages the same frame.

import { ARENA } from './config.js';
import {
  SCREEN_TITLE, SCREEN_PLAY, SCREEN_UPGRADE, SCREEN_OVER,
  startRun, stepWorld, applyUpgrade, STEP,
} from './world.js';

const SAMPLE = STEP;

function fakeInput() {
  return { keys: new Set(), mouseX: ARENA.width / 2, mouseY: ARENA.height / 2, mouseDown: false, pressed: new Set() };
}

function nearestEnemy(world) {
  const p = world.player;
  let best = null;
  let bestD = Infinity;
  for (const e of world.enemies) {
    const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

/**
 * Steer one step. skill 1 kites and shoots; skill 0 stands still and never
 * fires, so the run ends the way a careless player's does.
 */
function autopilot(world, input, skill) {
  const p = world.player;
  input.keys.clear();
  if (skill <= 0) {
    input.mouseDown = false;
    return;
  }
  const e = nearestEnemy(world);
  if (!e) {
    input.mouseDown = false;
    return;
  }
  input.mouseX = e.x;
  input.mouseY = e.y;
  input.mouseDown = true;
  let dx = p.x - e.x;
  let dy = p.y - e.y;
  const d = Math.hypot(dx, dy) || 1;
  dx /= d;
  dy /= d;
  // Strong pull toward the middle so the kite never pins itself in a corner,
  // plus a hard steer inward when close to a wall.
  dx += (ARENA.width / 2 - p.x) / 420;
  dy += (ARENA.height / 2 - p.y) / 420;
  if (p.x < 140) dx += 0.8;
  if (p.x > ARENA.width - 140) dx -= 0.8;
  if (p.y < 120) dy += 0.8;
  if (p.y > ARENA.height - 120) dy -= 0.8;
  const len = Math.hypot(dx, dy) || 1;
  dx /= len;
  dy /= len;
  if (dx > 0.3) input.keys.add('d');
  if (dx < -0.3) input.keys.add('a');
  if (dy > 0.3) input.keys.add('s');
  if (dy < -0.3) input.keys.add('w');
}

function runAutopilot(world, input, seconds, skill, onStep) {
  const steps = Math.floor(seconds / SAMPLE);
  for (let i = 0; i < steps; i += 1) {
    autopilot(world, input, skill);
    stepWorld(world, SAMPLE, input);
    if (onStep && onStep(world)) break;
    if (world.screen === SCREEN_OVER) break;
  }
}

/**
 * Set `world` to the named scene and return the screen to show. Any unknown
 * name stages the title.
 */
export function stageShot(name, world) {
  const input = fakeInput();
  if (name === 'play') {
    startRun(world);
    // Play in short bursts and stop mid-wave, while the arena is busy:
    // several enemies alive, bullets in flight, combo running. Prefer a
    // wave-3+ frame (darters in play) but take any busy frame after 20s.
    for (let burst = 0; burst < 60; burst += 1) {
      runAutopilot(world, input, 1, 1);
      if (world.screen === SCREEN_UPGRADE) {
        applyUpgrade(world, 0);
        continue;
      }
      if (world.screen === SCREEN_OVER) break;
      const busy = world.enemies.length >= 4 && world.bullets.length >= 2;
      if (busy && world.wave >= 3 && world.time > 6) break;
      if (busy && world.time > 20) break;
    }
    if (world.screen === SCREEN_UPGRADE) applyUpgrade(world, 0);
    if (world.screen !== SCREEN_PLAY) {
      startRun(world);
      runAutopilot(world, input, 8, 1);
    }
    return { screen: SCREEN_PLAY, best: world.best };
  }
  if (name === 'upgrade') {
    startRun(world);
    runAutopilot(world, input, 150, 1, (w) => w.screen === SCREEN_UPGRADE);
    if (world.screen !== SCREEN_UPGRADE) {
      // The pilot died or stalled: clear the wave through the game's own
      // state so the upgrade screen still shows a real cleared wave.
      startRun(world);
      world.spawnQueue = [];
      world.enemies = [];
      stepWorld(world, SAMPLE, input);
    }
    return { screen: SCREEN_UPGRADE, best: world.best };
  }
  if (name === 'over') {
    startRun(world);
    // Score first, the way a real run goes, then stop shooting and let the
    // wave close in — so the game-over screen shows a run that mattered.
    runAutopilot(world, input, 12, 1);
    if (world.screen === SCREEN_UPGRADE) applyUpgrade(world, 0);
    runAutopilot(world, input, 240, 0);
    if (world.screen !== SCREEN_OVER) {
      startRun(world);
      runAutopilot(world, input, 10, 1);
      world.player.health = 1;
      runAutopilot(world, input, 120, 0);
    }
    return { screen: SCREEN_OVER, best: world.best };
  }
  // Title: a real run plays behind the title overlay.
  startRun(world);
  runAutopilot(world, input, 4, 1);
  world.screen = SCREEN_TITLE;
  return { screen: SCREEN_TITLE, best: world.best };
}
