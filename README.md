# Neoluminous Pong

A neon glow Pong with light trails, black background, score counter, and two modes:
**Normal** (first to 11) and **Endless** (runs until you quit).

> **STATUS: POC BUILT — logic verified, visual review pending.** See
> `docs/RESULTS.md` for what was built and what to check.

## The look

- Black background, glowing neon paddles + ball.
- Every moving object leaves a **color-matched light trail** (ball blue, left
  paddle one neon, right paddle another).
- Score readout at top, center line, winner banner on a finished match.

## How it will run (POC)

Vanilla HTML5 Canvas + JavaScript, no build step, no dependencies.

```
open code/index.html
```

That's it — a browser tab is all you need. (Screenshots/short capture go in
`screenshots/`.)

## Controls

| Key        | Action                          |
|------------|---------------------------------|
| `W` / `S`  | Move left paddle up / down       |
| `↑` / `↓`  | Move right paddle (in menu: pick)  |
| `Space`    | Serve ball / pause               |
| `Enter`    | Play (start a match)             |
| `1`–`8`   | Pick match type directly          |
| `Esc`      | Quit Endless / back to menu      |

Single-keyboard 2-player local is the POC default. Mouse control for one side
and AI for the other is a roadmap item (see `docs/ROADMAP.md`).

## Match types (menu rows 1–8, ↑/↓ or 1–8 to pick)

- **1 · Human vs Human** — Normal: first to **11** points wins, then a winner
  banner and a restart prompt.
- **2 / 3 / 4 · VS Computer — EASY / MEDIUM / HARD** — Normal; the CPU pilots
  the right (magenta) paddle. EASY is a pushover, MEDIUM is the fair fight,
  HARD is the tough one. You always play the cyan side.
- **5 · Endless — 2 Players** — no winner; play until `Esc`. Score climbs
  forever.
- **6 / 7 / 8 · Endless vs Computer — EASY / MEDIUM / HARD** — endless vs the
  CPU at the same three difficulties.

## Folder map

```
neoluminous-pong/
├── README.md               ← you are here
├── docs/
│   ├── ANALYSIS.md         ← tech options compared + recommendation
│   ├── GAME-DESIGN.md      ← entities, physics, collision, scoring, state machine
│   ├── NEON-RENDERING.md   ← how the glow + light trails work
│   ├── PLAN.md             ← step-by-step implementation plan (approved)
│   ├── RESULTS.md          ← build results, verification, review checklist
│   ├── RESULTS-AI.md       ← slice 2: computer opponent + screenshots
│   ├── RESULTS-UX.md       ← slice 3: difficulty tiers, ball trail, menu nav
│   └── ROADMAP.md          ← POC scope vs. later
├── code/                   ← the game: index.html + style.css + game.js
├── screenshots/            ← captures of running game
└── temp/                   ← scratch files, never committed beyond need
```

## Repo

https://github.com/jesusoctavioas/neoluminouspong
