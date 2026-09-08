# Results — Slice 2: Computer Opponent + Mode Menu (+ Screenshots)

**Outcome: built, logic-verified, screenshotted, pushed.** One player can now
play alone: the menu offers four match types and an AI piloting the right
(magenta) paddle. All three documentation screenshots were captured with the
installed Chrome in headless mode.

## What changed

| File             | Change                                                                 |
|------------------|------------------------------------------------------------------------|
| `code/game.js`   | `opp` state (`'human'`/`'ai'`), 4-key menu select, `moveAI()`, mode label w/ "· CPU" |
| `code/index.html`| menu now 4 rows (below)                                               |
| `code/style.css` | `#mode-select` → vertical column layout                               |
| `temp/smoke.js`  | new step 8: AI-tracking assertion; step 7 uses the new key map        |
| `screenshots/`   | 3 PNGs (below)                                                        |
| `docs/GAME-DESIGN.md` | AI section, updated input map, POC scope                     |

Line count after slice: `game.js` 322 lines — still a single file, still zero
deps.

## The four menu modes (keys)

```
1 · HUMAN VS HUMAN            (Normal, first to 11)
2 · VS COMPUTER               (Normal, CPU on the right/magenta paddle)
3 · ENDLESS — 2 PLAYERS
4 · ENDLESS — VS COMPUTER
```

Selected row glows; the in-match header shows `NORMAL · CPU` / `ENDLESS · CPU`
when the computer is on. In AI modes the right paddle ignores `↑/↓` (the AI
owns it); the left paddle is always human — you always play the cyan side.

## AI design (the lazy version, by design)

`moveAI(p, dt)` — the computer paddle **tracks the ball's y through its own
center**, moving at `AI_SPEED = 400 px/s`, with an `AI_DEADZONE = 6 px` so it
doesn't jitter when the ball is level.

- It is **perfect at tracking but capped**: it never anticipates, it chases
  the current ball position, and it's slower than a human (`450 px/s`) —
  so sharp angled shots + the rally speed-up (cap 600 px/s) beat it.
- Single-file test of that balance: beat it in VS COMPUTER; if you can't,
  `AI_SPEED` down or `AI_DEADZONE` up are the only two knobs. Both are
  constants at the top of `game.js`.
- No prediction, no random errors, no difficulty tiers → roadmap, not POC.

## Verification

```
node --check code/game.js  → OK
node temp/smoke.js
  PASS — menu → Normal to 11 (win 0:11) → rematch → Endless 2P (no win)
       → AI tracks ball → menu
```

New/updated assertions:
- key map `Digit3` selects Endless+human, `Digit4` selects Endless+CPU
  (mode/opp read back from the real game state);
- **AI tracking**: with a deterministic ball drift (`vy = -60` after serve),
  the AI paddle's y must leave its start position and follow (`minY < 245`) —
  passes with ~11 px margin against the dead-zone.

The full 0:11 strict-win path is asserted on the unmodified `WIN_SCORE = 11`
in `code/game.js` (the screenshot rig, see below, used a throwaway `/tmp` copy
only — nothing in `code/` was weakened).

## Screenshots (how they were made)

`System Events`/`screencapture` from this process is blocked by macOS TCC
(black frames), so the shots come from **installed Chrome headless**, which
renders the real page and writes PNGs with no permissions:

```
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --hide-scrollbars --window-size=900,620 \
  --virtual-time-budget=3500 --screenshot=/tmp/out.png "file://...index.html"
```

- `01-menu.png` — real `index.html`, untouched.
- `02-rally-vs-cpu.png` — temporary `/tmp` wrapper page that replays
  `4 → Enter → Space` key events; captured mid-flight: the blue comet trail,
  both paddle wakes, `ENDLESS · CPU` header.
- `03-winner.png` — "MAGENTA WINS · ENTER REMATCH · ESC MENU" banner. The
  winner shot used a **throwaway `/tmp` copy** of the game with `WIN_SCORE=1`
  so the banner appears inside the headless freeze window (old headless
  throttles rAF after ~3 s — 11 real points can't complete in that window).
  The score reads 0:1 for that reason; the real game still requires 11
  (smoke-tested). A real 0:11 shot: play `2 · VS COMPUTER` and press
  `⇧⌘4` when the banner shows.

`/tmp` scratch (wrapper pages, patched copy) deleted after capture.

## What to check in your playthrough

- [ ] Menu: 4 rows, `1–4` highlights the pick, `Enter` starts the right one
- [ ] `2 · VS COMPUTER`: CPU defends your shots; beat it with edge-angle
      shots once the rally speeds up
- [ ] `4 · ENDLESS — VS COMPUTER`: survives indefinitely, score stacks
- [ ] In CPU modes `↑/↓` do nothing (AI owns the right paddle)
- [ ] Header shows `· CPU` only in AI modes
- [ ] Human-vs-human behaves exactly as before

## Deliberately left for later (ROADMAP.md)

AI difficulty tiers / prediction, AI on the *left* side, mouse/touch, high
scores, particles, screen shake.
