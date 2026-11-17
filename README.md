# NEON SURGE

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/kornztt/best-game/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/kornztt/best-game/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

A neon arena wave shooter. You are the last light in a dark grid-arena. Survive
escalating waves of chasers, shooters and splitters, chain kills into combos,
and pick one upgrade between waves. How long can you keep the surge alive?

## Controls

- **Move:** WASD or arrow keys, or drag on the left half of a touch screen
- **Aim:** mouse, or touch the right half of a touch screen (auto-fires)
- **Shoot:** hold left mouse button (watch the heat bar — overheating locks the gun until it cools)
- **Pause:** P or Esc
- **Upgrade choice:** click a card, or press 1 / 2 / 3
- **Restart:** R on the game-over screen, or click RESTART

## How to run

Serve `game/` with any static HTTP server and open `index.html` in a desktop
browser:

```sh
cd game && python3 -m http.server 8123
# open http://127.0.0.1:8123/index.html
```

No build step, no libraries, no network requests. Everything the game loads
lives under `game/`.

## The loop

1. A wave of enemies spawns from the arena edges — chasers, shooters,
   splitters, darters, and every 5th wave a boss.
2. Clear the wave to open the upgrade screen — pick 1 of 3 upgrades
   (damage, fire rate, speed, shield, multi-shot, piercing, regen,
   coolant, shrapnel).
3. The next wave is bigger and faster. Score grows with kills and with your
   combo multiplier. Health hits zero and the run ends; your best score is
   saved locally.

## Files

- `game/index.html` — page and canvas
- `game/src/main.js` — boot, game loop, screen state machine
- `game/src/config.js` — arena, palette, enemy and upgrade definitions
- `game/src/world.js` — game state, waves, spawning, collisions, upgrades
- `game/src/render.js` — all canvas drawing: arena, entities, HUD, screens
- `game/src/entities.js` — enemy and bullet factories
- `game/src/input.js` — keyboard and mouse state
- `game/src/audio.js` — synthesized WebAudio sound effects
- `game/src/random.js` — seeded random number generator
- `game/src/shots.js` — deterministic scene staging for screenshots
  (`?shot=title`, `?shot=play`, `?shot=upgrade`, `?shot=over`, `?seed=N`)

## License

MIT. See `LICENSE`.

## Revision

Playtested in headed Firefox (Xvfb + llvmpipe) on 2026-11-17, and fixed
three real problems the playtest found:

1. **Upgrade soft-lock (world.js).** Picking an upgrade never returned to
   play: `startWave` did not set the screen back to `play`, so the game sat
   on the upgrade screen forever after the first cleared wave. Fixed by
   setting `world.screen = SCREEN_PLAY` in `startWave`. Verified: clicking a
   card now starts wave 2 immediately.
2. **Audio console spam (audio.js).** Every sound effect called
   `AudioContext.resume()`, whose rejected promise logged an
   `InvalidStateError` on every shot and explosion during scripted scenes —
   hundreds of console errors in one run. `resume()` now runs only from the
   first user gesture (`unlockAudio`), with its rejection caught, and the
   tone/noise builders are wrapped so audio can never throw into the game
   loop. Verified: a full playtest run now reports zero console errors.
3. **Weak screenshots (shots.js).** The first gameplay shot caught an empty
   arena after a cleared wave, and the game-over shot showed a 0-point run.
   The `play` scene now stops mid-wave (several enemies alive, bullets in
   flight, combo running) and the `over` scene scores first, then stops
   shooting, so the game-over screen shows a run that mattered. The
   autopilot also got a stronger pull to the arena centre so the ship no
   longer kites into a corner.

## Revision 2 — 2026-11-17 (second improvement round, before resubmission)

A full playtest pass in headed Firefox (Xvfb + llvmpipe) found the game
solid but thin: three enemy kinds, five upgrades, no boss, no touch
support, and a gameplay screenshot that read as empty dark space. Changed:

1. **Boss waves (config.js, entities.js, world.js, render.js).** Every 5th
   wave is a BOSS wave: one OVERLORD (54px spiked hull, ~500 HP at wave 5,
   slow chase, 10-bullet radial bursts every 3.2s) with a top-centre health
   bar. Killing it pays 1000 points and repairs +30 hull. Verified live:
   radial bursts seen (10 enemy bullets at once), boss kill paid 1100 with
   the combo multiplier.
2. **Darter enemy (config.js, entities.js, world.js).** From wave 2: roams
   toward the player, flashes white to telegraph for 0.5s, then dashes at
   520 px/s. Verified spawning in wave 5+ play.
3. **Elite enemies (world.js, render.js).** From wave 4, 12% of spawns are
   elites: 2.2x HP, 1.15x speed, double score, marked with a white ring.
   Verified: an elite chaser spawned with 68 HP (base 31).
4. **Four new upgrades (config.js, world.js).** Piercing Rounds (bullets
   pierce +1 enemy), Nanobot Swarm (+1.5 hull/sec regen), Cryo Coolant
   (-35% heat per shot, +50% cooling), Shrapnel Core (kills detonate for
   30 damage in a 100px radius). All four verified by clicking the cards:
   pierce 0→1, heat per shot 7→4.55, regen 0→1.5, shrapnel on.
5. **Wave modifiers (config.js, world.js).** From wave 4, waves lean into
   one kind — SWARM, SNIPERS or SPLITTERS — shown in the wave banner.
6. **Game feel (world.js, render.js).** Enemies flash white when hit,
   muzzle-flash sparks, glowing bullet trails, expanding shockwave rings on
   splitter/boss kills and player death, and a pulsing red vignette under
   30% hull.
7. **Touch controls (input.js, main.js).** Left-half drag is a virtual
   joystick, right-half touch aims and auto-fires; taps start, restart and
   pick upgrade cards. Verified with synthetic touch events: joystick moved
   the ship 214px, aim locked to the touch point, bullets fired.
8. **Music (audio.js).** A quiet 16-step bass + hat loop (A minor,
   140 BPM) starts only after the first gesture, so it never autoplays;
   M mutes it. Plus a two-tone boss alarm, boss-shot boom and dash whoosh.

Screenshots re-taken from the same deterministic `?shot=` scenes
(seed 7): the gameplay shot is now wave 4, score 10785, combo x3.0 with
bullet trails and a darter on screen. Full verification (staged shots,
upgrade clicks, R restart, live 10s playtest, pause, boss fight, touch)
reports zero page errors.

---

<sub>Entered on [make.fun](https://make.fun/?ref=werh0je7&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
