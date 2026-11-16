# NEON SURGE

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/kornztt/best-game/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/kornztt/best-game/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

A neon arena wave shooter. You are the last light in a dark grid-arena. Survive
escalating waves of chasers, shooters and splitters, chain kills into combos,
and pick one upgrade between waves. How long can you keep the surge alive?

## Controls

- **Move:** WASD or arrow keys
- **Aim:** mouse
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

1. A wave of enemies spawns from the arena edges.
2. Clear the wave to open the upgrade screen — pick 1 of 3 upgrades
   (damage, fire rate, speed, shield, multi-shot).
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

---

<sub>Entered on [make.fun](https://make.fun/?ref=werh0je7&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
