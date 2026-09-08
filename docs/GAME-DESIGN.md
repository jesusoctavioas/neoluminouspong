# Game Design

All logic for the POC. Everything here is deterministic and unit-testable in
principle; the POC itself is a single hand-tuned file, so numbers are defaults
you'd tune by feel.

## Field & entities

Logical canvas: **800 × 500** (CSS-scales to viewport; internal buffer multiplies
by `devicePixelRatio` for crispness).

| Entity   | Value (default)                                   | Notes |
|----------|---------------------------------------------------|-------|
| Paddle   | w 12, h 80, x = 20 (L) / 768 (R)                  | clamped to field, speed 450 px/s |
| Ball     | r 8, serve speed 140 px/s                         | speed cap 600 px/s, +6% per paddle hit |
| Center   | dashed vertical line at x = 400                   | neon dim, static |

Coordinates: origin top-left, `y` grows downward. All motion is
**delta-time based** (`dt` seconds, clamped to 1/30 s) so speed is FPS-independent.

## States (finite state machine)

```
        ┌────────┐  1/2 picks mode   ┌────────────┐  Space   ┌─────────┐
menu ──▶│        │──────────────────▶│  serving   │─────────▶│ playing │
        └────────┘                    └────────────┘          └────┬────┘
              ▲                                                     │
              │ Esc (endless quit) / Enter restart (over)           │ ball passes
              │                                                     ▼
        ┌─────┴────┐   Normal & scorer==11   ┌───────────┐     ┌─────────────────┐
  over ◀│          │─────────────────────────│ point-end │     │ endless point-end│
        └──────────┘                         └─────┬─────┘     └────────┬────────┘
                                                   │ re-serve (delay)     │ re-serve
                                                   ▼                      ▼
                                                 serving              serving
```

- **menu** — title, mode select (`1` Normal / `2` Endless).
- **serving** — ball glued to center, waits for `Space`.
- **playing** — ball live; paddles move.
- **point-end** — brief pause (≈1 s) after a score, shows whose point, then re-serve.
  - Normal: if the scorer reached **11**, go to **over** instead.
  - Endless: always re-serve (no **over**).
- **over** — winner banner, `Enter` restarts, `Esc` → menu.

Endless has no **over**: `Esc` just drops to **menu**.

## Physics per frame (dt)

```
1. Move paddles:   y += dir * PADDLE_SPEED * dt;  clamp(−h/2 .. H−h/2)
2. Move ball:      x += vx*dt;  y += vy*dt        (dt ≤ 1/30 s)
3. Wall bounce:    if y−r < 0 → y = r,   vy = −vy
                   if y+r > H → y = H−r, vy = −vy         (sound blip)
4. Paddle collide (AABB vs circle, left paddle as example; right mirrored):
     if ball.vx < 0 and  ball.x−r < L.x+L.w and  ball.x−r > L.x − 2
        and  ball.y in [L.y, L.y+L.h]:
          rel   = (ball.y − (L.y+L.h/2)) / (L.h/2)        # −1..1
          ang   = rel * MAX_BOUNCE_ANGLE (60°)
          speed = min(speed * 1.06, SPEED_CAP)
          vx =  speed * cos(ang);  vy = speed * sin(ang)
          ball.x = L.x + L.w + r                              # un-tunnel
          (sound blip)
5. Score:
     if ball.x < −r   → right player scores
     if ball.x > W+r  → left player scores
```

- **MAX_BOUNCE_ANGLE 60°** — classic Pong, keeps rallies recoverable.
- **Speed-up +6%/hit, cap 600 px/s** — rallies feel faster; the cap keeps the
  ball sub-pixel-per-frame at 60 fps (600/60 = 10 px ≫ r 8, so the swept
  check in step 4's `> L.x − 2` margin is what prevents tunneling; if we ever
  push past ~1000 px/s, switch to continuous collision).

## Scoring & win

- **Normal:** first to **11** → **over**. (No 2-point-margin rule in the POC —
  matches the brief "conclude when one player reach 11". Margin-to-2 is a
  one-line roadmap option.)
- **Endless:** no win; scores increment forever; `Esc` ends to menu.

## Input map

| Key    | Effect                                   |
|--------|------------------------------------------|
| `W`/`S`  | left paddle up/down                      |
| `↑`/`↓` | right paddle up/down · **in menu: move selection (wraps)** |
| `Space`| serve (serving) / pause-resume (playing) |
| `Enter`| start (menu→serving) / restart (over)     |
| `1`–`8` | jump straight to a menu row (see rows below)                |
| `Esc`    | endless→menu, over→menu                  |

Key state is a `Set` of currently-held codes; movement reads it each frame
(no repeat-delay). Pausing during **playing** is a sub-flag, not a new state.

In CPU modes the right paddle ignores `↑`/`↓` — the AI owns it.

## Opponent AI (right/magenta paddle)

`moveAI(p, dt)` tracks the ball's y through the paddle's center, with
per-difficulty speed + dead-zone (constants at the top of `game.js`):

| Tier   | Speed (px/s) | Dead-zone (px) | Feel                                        |
|--------|--------------|----------------|---------------------------------------------|
| EASY   | 220          | 20             | slow + sloppy; loses to anything angled     |
| MEDIUM | 330          | 10             | fair fight; beat with sharp late angles     |
| HARD   | 430          | 4              | the old 400/6 behavior — the "too strong" one |

Pure chase: no prediction, no anticipation. A human (450 px/s) is faster than
the CPU at every tier — the fight is about angles, not raw speed.

Runs in `SERVE` and `PLAY` like human paddles; re-centers on each serve;
leaves a magenta trail like everything else.

## Rendering order (per frame)

1. Trail layer (see `NEON-RENDERING.md`)
2. Center line
3. Paddles + ball (with glow)
4. DOM overlay: score, mode label, banners (crisp text outside canvas)

## POC scope (build now)

Everything above, plus the **opponent AI** (section above) with three
difficulty tiers and the eight-row menu:
1 human+human · 2–4 vs CPU easy/medium/hard · 5 endless 2P · 6–8 endless
vs CPU easy/medium/hard. Keyboard, both match lengths, score, win,
neon+trails (ball trail: 32 frames, extra glow), Web Audio blips.

## Explicitly deferred (see ROADMAP.md)

mouse/touch control, AI prediction, AI on the left side, per-player sound
toggle, match-to-11-then-2 margin, high-score persistence, screen shake,
particle burst on hit.
