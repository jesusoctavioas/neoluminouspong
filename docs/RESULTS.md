# Results — POC Build (per PLAN.md v1)

**Outcome: built, logic-verified, pushed.** The game is in `code/` and was
opened in your default browser. Headless logic tests pass end-to-end.
Visual playthrough review is the remaining gate (you're driving the keyboard).

## What was built

| File            | Lines | Role                                                     |
|-----------------|-------|----------------------------------------------------------|
| `code/index.html` | 29  | canvas + DOM overlays (scores, mode, banner, menu)      |
| `code/style.css`  | 50  | black page, centered stage, neon text glow             |
| `code/game.js`    | 305 | all logic: input, FSM, physics, neon render, audio, loop |
| `temp/smoke.js`   | 97  | headless smoke test (stubbed DOM, real game loop)      |

Zero dependencies, no build. Everything from PLAN v1 section 4 is in place:
8 `game.js` sections (constants → canvas → state → input → audio → update →
render → loop), DOM-resident text, additive trail pass, dual-fill glow.

## How to run

```
open code/index.html        # or double-click the file
node temp/smoke.js          # re-run the headless logic test
```

## Controls (as planned)

`W/S` + `↑/↓` paddles · `Space` serve / pause · `Enter` start / rematch ·
`1`/`2` mode · `Esc` quit to menu.

## Verification

1. **`node --check code/game.js`** — syntax clean.
2. **`node temp/smoke.js`** — runs the *real* `game.js` with a stubbed DOM and
   plays whole matches. Last run:
   ```
   PASS — menu → Normal to 11 (win 0:11) → rematch → Endless (no win) → menu
   ```
   Proved by assertion: menu boot, serve, ball exits field, score increments,
   trail cleared on point, 1 s point-end → re-serve, **strict-11 win** (score
   object held exactly 0:11 at `over`), winner banner text, rematch resets
   0:0, Endless plays 4 points and *never* enters `over`, `Esc` → menu.
3. **Live browser** — opened for you; needs the human eye for neon/trail look
   and feel. That's the review.

Test design note: the smoke test drives no keys. Two stationary centered
paddles would legally rally forever, so the test collapses them (`h=0`, y
pinned to the top edge) — collision bands then sit at `y∈[-8,8]` while the
ball's worst-case y at paddle x is `y∈[19,481]`, clear by construction. Every
serve deterministically ends in a point.

## Deviations from PLAN v1 (all one-liners, all deliberate)

- **Serve heading** randomized within ±30° (plan implied straight serve).
  Variety without new knobs; speed stays at `SERVE_SPEED`.
- **Paddles re-center on every serve** (classic Pong; makes serves fair).
- **`Esc` quits a Normal match too** (plan only required it for Endless —
  harmless superset).
- Center line is a 2 px dashed stroke, color `#1b2b55` (dim, per spec).

Nothing dropped. No roadmap items added.

## Screenshots

**Pending your review.** `screencapture` from this process returned a black
frame (no screen-recording permission for the agent's terminal process —
macOS TCC, not a game bug). Easiest: while playing, `⇧⌘4` for menu, mid-rally,
and winner shots; drop them in `screenshots/` (or say the word and I'll retry
the capture once permission is granted).

## What to check in your playthrough

- [ ] Neon reads as neon — cyan/magenta paddles, blue ball on pure black
- [ ] Trails: ball leaves a blue comet; paddles leave short color wakes;
      cleared on each point (no streak across the field)
- [ ] Hit paddle edge → ball angles up/down; rally speeds up then caps
- [ ] Blips fire after first keypress (wall < paddle < score pitch order)
- [ ] At 11: "CYAN WINS" / "MAGENTA WINS" banner, `Enter` rematches, `Esc` menus
- [ ] Endless: scores stack past 11 with no end until `Esc`
- [ ] `Space` pauses mid-rally; window blur doesn't stick keys

## After this is signed off

Top of `docs/ROADMAP.md`: AI opponent (highest value), then mouse/touch,
2-point-margin option, high-score in `localStorage`, hit particles, screen
shake. Each is an isolated addition to the same three files.
