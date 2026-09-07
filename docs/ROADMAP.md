# Roadmap

## POC (this build — after review)

The single proof-of-concept target. All vanilla Canvas2D, 3 files in `code/`.

- [x] *docs complete (this repo state)*
- [ ] `code/index.html`, `code/style.css`, `code/game.js`
- [ ] 2 players, keyboard (W/S + arrows), single keyboard local
- [ ] Pong physics: wall bounce, paddle bounce w/ angle, serve, score detect
- [ ] Neon glow (shadowBlur) + color-matched light trails (ball + both paddles)
- [ ] Score counter (DOM), center line, winner banner
- [ ] **Normal** mode: first to 11 → winner → restart
- [ ] **Endless** mode: no win, runs until `Esc`
- [ ] Menu: mode select, start
- [ ] Web Audio blips on bounce/score (tiny, toggle later)
- [ ] First screenshots → `screenshots/`

**Definition of done:** open `code/index.html` in a browser, pick a mode, two
people on one keyboard rally with glowing trails, someone hits 11 and it
declares a winner (Normal) or it just keeps going (Endless).

## After the POC (only when we ask for it)

Each is a small, independent addition to the single file — no rebuild needed.

- **AI opponent** — one key plays vs a simple tracking AI (ball.y follow with
  dead-zone). Makes solo play + screenshots easy. *Highest-value next step.*
- **Mouse/touch** — one paddle follows the pointer; enables single-player.
- **Win-margin to 2** — classic 11-point table-tennis rule (needs 2-lead).
- **Sound toggle** (`M`) + a subtle menu music loop.
- **High score / longest-rally record** — `localStorage`, shows in menu.
- **Particle burst** on paddle hit & score — additive dots, reuses the `lighter`
  pass from `NEON-RENDERING.md`.
- **Screen shake** on a point (a few frames of canvas translate jitter).
- **Serving alternation + short countdown** for fairer serves.
- **Themes** — swap the palette object (one constant) for different neon sets.

## Only if we outgrow the single file

- Split into modules / add a bundler → only if code grows past ~1000 lines or
  we want typed logic tests.
- React/Vite → only if we add a surrounding app (settings, leaderboard, store).
- Phaser → only if entities/features explode (power-ups, many sprites).
- WebGL bloom → only if we want heavy post-process glow. `shadowBlur` will not
  be the bottleneck at Pong scale.

None of the above is needed to make the POC feel great.
