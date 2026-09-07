# Technical Analysis

How to build Neoluminous Pong and what tech each option needs. Read bottom-up:
options first, recommendation last.

## What the game actually needs

A feature budget, so we know what the stack must do:

1. 2D rendering at 60 fps — two paddles, one ball, a score, a center line.
2. **Neon glow** on shapes.
3. **Color-matched light trails** behind moving objects.
4. Pong physics: wall bounces, paddle bounces with angle, serve, score detection.
5. Input: keyboard (2 players) in the POC.
6. Simple state machine: menu → playing → point-scored → match-over (Normal) /
   endless until quit.
7. Score counter + win condition (first to 11) + Endless mode.

That's it. No assets, no networking, no save, no multi-platform requirement
stated. This is a **toy physics + rendering** problem.

## Option A — Vanilla HTML5 Canvas + JS  ✅ recommended

- **Runtime:** any browser. No install, no build step, no server.
- **Rendering:** `Canvas2D` — `requestAnimationFrame` loop, `fillRect`/`arc`,
  `ctx.shadowBlur` for glow, a trail buffer for light streaks.
- **Input:** `keydown`/`keyup` listeners.
- **Audio (optional):** Web Audio API beeps (lazily: skip or add later).
- **Dependencies:** **zero.**
- **Size:** comfortably one file (`index.html` + inline JS), or split into
  `index.html` / `game.js` / `style.css`.
- **Pros:** fastest to a running demo, trivially shareable (open the file or
  drop it on any static host), Canvas is purpose-built for exactly this effect.
- **Cons:** Canvas2D glow (`shadowBlur`) can be a bit expensive if misused; we
  keep entity/segment counts tiny so it's a non-issue.

## Option B — React / Vite + Canvas

Same Canvas code wrapped in a React app. **Rejected for POC.** A game loop with
per-frame canvas draws does not belong in a reactive view layer; you'd fight the
framework for zero benefit. Revisit only if we later want a settings UI,
leaderboard page, or store submission with surrounding app chrome.

## Option C — Pygame (Python)

- Desktop window, `pip install pygame`.
- Glow via `pygame.draw` + alpha surfaces / `KIND` glow filters is clunkier than
  Canvas; trails are doable (store positions) but less elegant.
- **Rejected** — requires an install to run, screenshots are a friction point,
  and sharing a "just open the file" web demo beats a `.py` you have to install.

## Option D — Phaser 3 (game framework)

Full 2D engine (scenes, input, arcade physics, tweens). **Rejected for POC** —
Pong is <100 lines of custom physics; a framework is overhead we'd manage for
nothing. Revisit only if the game grows (particles, power-ups, many entities).

## Option E — WebGPU / WebGL

GPU pipelines give the richest glow, but a WebGL/WebGPU Pong is *more* code, not
less, for a two-object demo. **Rejected** — wrong tool size. (If we ever want
heavy bloom/post-processing, `canvas` can export a frame to a WebGL shader, but
that's a far-future optimization.)

## Recommendation

**Option A — vanilla HTML5 Canvas 2D + JS, single file, zero dependencies.**

Rationale:
- The POC's whole identity is the *visual* (neon + trails), and Canvas2D does it
  in a dozen lines each. Everything else is ~100 lines of Pong logic.
- Zero install, zero build, zero deps → fastest from "agree on approach" to
  "watch it run", which is exactly the proof-of-concept goal.
- Every later nicety (AI, sounds, mouse, particles, high score) slots into the
  single file without a rebuild.

**Deliverable shape:** `code/index.html` with the game, or a 3-file split
(`index.html`, `style.css`, `game.js`) if we want readability over single-file.
Default: **3-file split** — easier to navigate than one 500-line HTML blob.

### Suggested file layout for the POC

```
code/
├── index.html    # <canvas>, overlay DOM (score, banner), mounts game.js
├── style.css     # page/chrome styling, fonts, centering
└── game.js       # all game logic + rendering (state machine, physics, draw)
```

**Decision (confirmed by Octavio):** 3-file split; Web Audio blips included.
Full implementation plan: see `docs/PLAN.md`.
