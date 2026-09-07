# Implementation Plan (v1 — for review, no code yet)

Everything below is agreed-upon shape only. **Nothing is written to `code/`
until this plan is approved.** After approval: build step-by-step (one commit
per step), push, capture screenshots.

## 1. Goal / definition of done

Open `code/index.html` in a browser → menu; pick **Normal** (1) or **Endless**
(2); two players on one keyboard rally a glowing ball with color-matched
light trails; blip sounds on contact; score at top; Normal ends at the first
player to exactly **11** with a winner banner; Endless runs until `Esc`.
Screenshots of menu, mid-rally, and winner in `screenshots/`.

## 2. Locked decisions (confirmed by Octavio)

| # | Decision        | Value                        |
|---|-----------------|------------------------------|
| 1 | File layout     | 3 files: `index.html` + `style.css` + `game.js` |
| 2 | Ball color      | electric blue `#4d7cff`      |
| 3 | Audio           | yes — tiny Web Audio blips   |
| 4 | Win rule (Normal) | strict first to 11 (no 2-point margin) |
| 5 | Palette         | L pad cyan `#00f0ff`, R pad magenta `#ff2bd6`, center `#1b2b55`, bg `#000000` |

## 3. Architecture (one screen, one loop, no library)

```
index.html      DOM: <canvas id="game"> + overlay divs (score L/R, mode, banner, menu, "paused")
style.css       black page, centered canvas, neon text styles, overlay positioning
game.js         all logic, ~350–450 lines, sections in build order (step 9 below)
```

- Single `requestAnimationFrame` loop, `dt` clamped to 1/30 s.
- Rendering split: dynamic game stuff in canvas (trails + glowing shapes);
  all text (score, banner, menu, mode, paused) in **DOM overlays** → crisp.
- No modules, no bundler, no state library — one file, top-to-bottom readable.

## 4. File specs

### 4.1 `index.html`
- `<canvas id="game" width="800" height="500">` (logical size; JS scales the
  backing store by `devicePixelRatio` for crisp lines).
- Overlay container (absolute, pointer-events none) with:
  - `#score-l`, `#score-r` — big neon numerals, top-left / top-right
  - `#mode` — small label top-center ("NORMAL" / "ENDLESS")
  - `#banner` — hidden; centered text ("CYAN WINS", "PAUSED", "POINT: MAGENTA")
  - `#menu` — hidden; title + mode select (1 NORMAL / 2 ENDLESS, selected
    one highlighted) + "ENTER to start"; shown only in `menu` state.
- Loads `style.css`, then `game.js`.

### 4.2 `style.css`
- Page: black bg, canvas centered, scales down on small windows
  (`width: min(800px, 96vw)`, height auto, preserves ratio).
- Neon text: color per side + `text-shadow` glow matching the object colors
  (same hexes as canvas objects → DOM and canvas glow match).

### 4.3 `game.js` — sections (top to bottom)

```
1. CONSTANTS     (table below — every tunable in one place)
2. CANVAS SETUP  dpr sizing; ctx
3. STATE         state enum + entity objects (below)
4. INPUT         keydown/keyup → Set of held codes; per-state key handling
5. AUDIO         lazy AudioContext (created on first keydown);
                 blip(freq, dur, gain) osc + gain envelope
6. UPDATE(dt)    per-state logic: paddles, ball, collisions, scoring,
                 point-end timer, trail push/clear
7. RENDER        bg clear → center line → trails ('lighter') → shapes ('lighter' + shadowBlur) → sync DOM overlays
8. MAIN LOOP     rAF; dt = min((t - last)/1000, 1/30)
```

**Entities (plain objects):**
```js
left  = { x: 20,      y: H/2, w: 12, h: 80, color: C.left,  trail: [] }
right = { x: W-20-w.., y: H/2, w: 12, h: 80, color: C.right, trail: [] }
ball  = { x: W/2, y: H/2, r: 8, vx: 0, vy: 0, speed: 140, color: C.ball, trail: [] }
score = { l: 0, r: 0 }
```

**Final constants:**
```
W=800 H=500
PADDLE_SPEED=450  MAX_BOUNCE_ANGLE=60°  SERVE_SPEED=140
HIT_SPEEDUP=1.06  SPEED_CAP=600
TRAIL_LEN=16  GLOW_SHAPE=18  GLOW_TRAIL=14
POINT_END_DELAY=1.0s
AUDIO: paddle-hit 520Hz / wall 260Hz / score 880Hz / serve 330Hz, ~60ms, sine
```

## 5. Build steps (one commit each, push on completion)

Each step leaves the game **runnable in the browser** — no half-states.

1. **Scaffold** — `index.html` + `style.css` + `game.js` constants; canvas shows
   black field, dim center line, both paddles static, DOM scores at 0.
   *Verify: open file → static neon-ish field.*
2. **Input + paddles** — key Set, W/S & arrows move paddles at 450 px/s,
   clamped to field. *Verify: both paddles move, stop at edges.*
3. **Serve + ball motion + wall bounce** — `Space` launches ball (toward the
   player NOT scored on last point, first serve toward left), ball moves with
   dt, bounces top/bottom, blip on wall. *Verify: rally against walls, no
   sticking, sound after first keypress (autoplay policy).*
4. **Paddle collision** — swept AABB check, contact-point angle (±60° max),
   speed ×1.06 (cap 600), x un-tunnel on hit, blip. *Verify: hit top/bottom of
   paddle sends ball at steeper angle; rallies accelerate, capped.*
5. **Scoring + re-serve** — ball exits a side → opponent +1, DOM updates,
   1 s point-end banner, clear all trails, ball waits at center for `Space`.
   *Verify: deliberate miss → score ticks, trails reset, no streak across field.*
6. **State machine + modes** — menu (title, `1`/`2` select with highlight,
   `Enter` starts), **over** in Normal at strict 11 (banner "CYAN/MAGENTA
   WINS", `Enter` rematch, `Esc` menu), Endless = no over (`Esc` → menu).
   `Space` during play pauses/resumes with "PAUSED" banner.
   *Verify: full loop menu→play→over→menu in both modes; pause works.*
7. **Trails + glow** — per-object trail buffers (len 16), additive tapering
   segments in object color; double-fill `shadowBlur` glow on paddles/ball.
   *Verify: blue streak on ball, cyan/magenta wakes on paddles; glow reads as
   neon on black; cleared on re-serve.*
8. **Audio pass** — blips on paddle, wall, score, serve; toggle on later.
   *Verify: quiet, distinct pitch per event, no error before first input.*
9. **Polish + ship** — trail/glow tuning by eye, DOM score font sizing, edge
   cases (serve after window blur, rapid Enter mashing), screenshots
   (menu / mid-rally / winner) via browser capture into `screenshots/`,
   final README status update, **push**.

## 6. Acceptance checklist (at step 9)

- [ ] Opens with double-click / `open code/index.html`, zero console errors
- [ ] Menu: 1/2 selects, Enter starts, Esc returns
- [ ] Both paddles obey W/S and ↑/↓, clamped, 60 fps
- [ ] Ball: angle changes with contact point; speed climbs then caps
- [ ] Missed ball → correct side scores; trails clear
- [ ] Normal: at 11 the match stops, winner banner, Enter/Esc behave
- [ ] Endless: plays indefinitely; Esc → menu
- [ ] Pause (Space) mid-play; blur/blur-safe (dt-clamp covers tab-away)
- [ ] Sounds only after first keypress (browser autoplay)
- [ ] Screenshots committed: menu, rally, winner
- [ ] Repo in sync (`git push` clean)

## 7. Known small risks (and the lazy handling)

- **Tunneling** — at 600 px/s cap, max 10 px/frame < paddle catch margin
  (`x − 2` check). If we ever raise the cap, switch to continuous collision.
- **Autoplay policy** — `AudioContext` created on first keydown, not at load;
  no user can hear anything before they interact anyway.
- **`devicePixelRatio` scaling** — one-time setup; if text/lines look soft on
  retina, it's the dpr path, single place to look.
- **`shadowBlur` cost** — ~50 shadowed draws/frame at 800×500: negligible.
  Pre-rendered glow sprites only if profiling ever disagrees.

## 8. After approval

Steps 1–9 in order, local commit each, one push at the end, screenshots in.
Rough size when done: `index.html` ~30 lines, `style.css` ~60, `game.js` ~400.
