// NEON SURGE — boot, game loop and screen state machine.
// One clear job: own the frame — read input, step the world, draw it —
// and move between title, play, upgrade, pause and game over.

import { ARENA } from './config.js';
import { createInput, keyPressed, endFrameInput } from './input.js';
import { unlockAudio, toggleMute, sfx } from './audio.js';
import {
  SCREEN_TITLE, SCREEN_PLAY, SCREEN_UPGRADE, SCREEN_OVER, SCREEN_PAUSED,
  createWorld, startRun, stepWorld, applyUpgrade,
} from './world.js';
import { render, upgradeCardRects } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = ARENA.width;
canvas.height = ARENA.height;

const input = createInput(canvas);
const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed')) || 1;
const shotName = params.get('shot');
const world = createWorld(seed);

let frozen = false;

if (shotName) {
  const staged = stageShot(shotName, world);
  world.screen = staged.screen;
  frozen = true;
  document.title = `NEON SURGE — ${shotName}`;
}

function cardIndexAt(x, y) {
  const rects = upgradeCardRects();
  for (let i = 0; i < rects.length; i += 1) {
    const r = rects[i];
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
  }
  return -1;
}

function handlePointerDown(clientX, clientY) {
  unlockAudio();
  if (world.screen === SCREEN_TITLE) {
    sfx.click();
    startRun(world);
  } else if (world.screen === SCREEN_OVER) {
    sfx.click();
    startRun(world);
  } else if (world.screen === SCREEN_UPGRADE) {
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;
    const index = cardIndexAt(x, y);
    if (index >= 0) applyUpgrade(world, index);
  }
}

canvas.addEventListener('mousedown', (event) => {
  if (event.button !== 0) return;
  handlePointerDown(event.clientX, event.clientY);
});

// Touch taps start / restart / pick upgrades the same way clicks do.
canvas.addEventListener('touchstart', (event) => {
  const t = event.changedTouches[0];
  if (t) handlePointerDown(t.clientX, t.clientY);
});

function handleKeys() {
  if (keyPressed(input, 'm')) toggleMute();
  if (world.screen === SCREEN_PLAY) {
    if (keyPressed(input, 'p') || keyPressed(input, 'Escape')) world.screen = SCREEN_PAUSED;
  } else if (world.screen === SCREEN_PAUSED) {
    if (keyPressed(input, 'p') || keyPressed(input, 'Escape')) world.screen = SCREEN_PLAY;
    if (keyPressed(input, 'r')) startRun(world);
  } else if (world.screen === SCREEN_OVER) {
    if (keyPressed(input, 'r')) startRun(world);
  } else if (world.screen === SCREEN_UPGRADE) {
    if (keyPressed(input, '1')) applyUpgrade(world, 0);
    else if (keyPressed(input, '2')) applyUpgrade(world, 1);
    else if (keyPressed(input, '3')) applyUpgrade(world, 2);
  } else if (world.screen === SCREEN_TITLE) {
    if (keyPressed(input, ' ') || keyPressed(input, 'Enter')) {
      unlockAudio();
      startRun(world);
    }
  }
}

let last = performance.now();

function frame(now) {
  const dt = Math.min(1 / 30, Math.max(0, (now - last) / 1000));
  last = now;
  handleKeys();
  if (!frozen) {
    if (world.screen === SCREEN_PLAY || world.screen === SCREEN_TITLE) {
      stepWorld(world, dt, world.screen === SCREEN_PLAY ? input : null);
    } else if (world.screen === SCREEN_UPGRADE || world.screen === SCREEN_OVER) {
      stepWorld(world, dt, null);
    }
  }
  render(ctx, world, input);
  endFrameInput(input);
  requestAnimationFrame(frame);
}

// Exposed for playtesting and debugging from the console.
window.__NEON__ = { world, input };
requestAnimationFrame(frame);
