# Results — Slice 3: AI Difficulty, Bigger Ball Trail, Menu Navigation

**Outcome: built, tested, screenshotted, pushed.** Three review requests from
Octavio: the AI felt too strong → difficulty tiers; the ball should leave more
light; the menu should be navigable with ↑/↓ in addition to the number keys.

## 1. AI difficulty tiers

The single `AI_SPEED`/`AI_DEADZONE` pair became a three-tier table
(`game.js` constants):

| Tier   | Speed (px/s) | Dead-zone (px) | Intent                                    |
|--------|--------------|----------------|-------------------------------------------|
| EASY   | 220          | 20             | loses to anything angled, fast or slow    |
| MEDIUM | 330          | 10             | the fair default — sharp late angles win  |
| HARD   | 430          | 4              | the old 400/6 behavior (what felt too strong) |

Design point: a human paddle is **450 px/s**, faster than the CPU at *every*
tier — the CPU is never won against by pure speed, only by angle and timing.
"Too strong" is now "row 4"; if MEDIUM also feels hot, it's a one-number edit.

## 2. The ball is the hero of the trail pass

`drawTrail()` is now parameterized (width multiplier, alpha, glow per object):

|            | Frames | Alpha | Width × | Head glow (blur) |
|------------|--------|-------|---------|------------------|
| Ball       | 32     | 0.85  | 1.7×    | 22               |
| Paddles    | 16     | 0.55  | 1.0×    | 14               |

The ball leaves a ~0.5 s neon comet; the paddles keep short wakes so they
read as secondary. Tunables: `BALL_TRAIL_LEN`, the three `drawTrail` call
args, `GLOW_TRAIL_BALL`.

## 3. Menu: 8 rows, ↑/↓ + 1–8

```
 1 · HUMAN VS HUMAN
 2 · VS COMPUTER — EASY          6 · ENDLESS VS COMPUTER — EASY
 3 · VS COMPUTER — MEDIUM        7 · ENDLESS VS COMPUTER — MEDIUM
 4 · VS COMPUTER — HARD          8 · ENDLESS VS COMPUTER — HARD
 5 · ENDLESS — 2 PLAYERS
```

- `↑/↓` moves the selection with **wrap-around** (up from row 1 → row 8);
  `1–8` jumps directly; `Enter` starts. No hidden state — every row is an
  explicit menu entry, selected row glows.
- In-match header now shows the full pick: `NORMAL · CPU · MEDIUM`.
- Implementation: one `MODES` table (8 × [length, opponent, difficulty]) +
  `sel` index + `select(i)`; the old 4-row `picks` map is gone.

## Verification

```
node --check code/game.js  → OK
node temp/smoke.js
  PASS — menu → Normal to 11 (win 0:11) → rematch → Endless 2P (no win)
       → AI(medium) tracks ball → menu nav + wrap → menu
```

New/updated assertions: 8-key map (keys 5/7 select the endless rows),
`diff` readback per row, ↑/↓ movement, **wrap from row 1 to row 8**, and
start-from-selection (Enter on row 8 → serve). The strict-0:11, endless-no-win
and AI-tracking paths re-pass unchanged on the new code.

Two bugs caught by the tests before they shipped (both real):
- `code.charCodeAt(0) - 49` computed from the 'D' of "Digit5" — numbers
  parsed from the trailing digit instead;
- a wrap test that was off by one keystroke (fixed the *test*, not the game).

## Screenshots (re-captured, same Chrome-headless rig)

- `01-menu.png` — the 8-row menu with ↑/↓ / 1–8 footer
- `02-rally-vs-cpu.png` — `ENDLESS · CPU · MEDIUM`, new ball comet
- `03-winner.png` — banner + `NORMAL · CPU · MEDIUM` (still the throwaway
  `WIN_SCORE=1` copy for the headless freeze window — real game still 11,
  smoke-proven)

## What to check in your playthrough

- [ ] Menu: ↑/↓ walks the list (wraps at both ends), 1–8 jumps, Enter starts
- [ ] Row 2 (EASY): CPU is beatable comfortably — this is the "was too strong" fix
- [ ] Row 3 (MEDIUM): fair fight; edge angles still decide it
- [ ] Row 4 (HARD): as tough as before (that's the old behavior, on purpose)
- [ ] Ball trail is longer/brighter than the paddle wakes on every shot
- [ ] Header shows e.g. `NORMAL · CPU · EASY` in the right cases

## Deliberately left for later

AI *prediction* (aiming at future ball position, not chase), AI on the left
side, difficulty shown/persisted in high scores (there are no high scores
yet), sound toggle — all still on `docs/ROADMAP.md`.
