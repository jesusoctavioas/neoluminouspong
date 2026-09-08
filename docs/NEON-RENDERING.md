# Neon Rendering — glow + light trails

This is the part that makes it *neoluminous*. Two combined techniques on
Canvas2D. Keep it boring and fast: few entities, so nothing here is a perf
concern, but the right order of operations matters for the look.

## Palette (defaults — trivially tunable)

| Object    | Neon color      | Hex       |
|-----------|-----------------|-----------|
| Left pad  | cyan            | `#00f0ff` |
| Right pad | magenta         | `#ff2bd6` |
| Ball      | electric blue   | `#4d7cff` |
| Center ln | dim white/blue  | `#1b2b55` |
| Bg        | black           | `#000000` |

(Decide in review: ball color — blue vs white-hot vs gradient. Default blue.)

## Technique 1 — the glow (halo)

`ctx.shadowBlur` + `ctx.shadowColor` turn any fill into a glowing shape.

```js
function neonRect(x, y, w, h, color) {
  ctx.save();
  ctx.shadowBlur = 18;
  ctx.shadowColor = color;     // halo casts in this color
  ctx.fillStyle   = color;
  // draw twice: first pass builds the halo, second a brighter core
  ctx.fillRect(x, y, w, h);
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}
```

- The double fill gives a saturated core with a soft halo (single fill reads
  flat). `shadowBlur 16–24` is the sweet spot; higher = mushy.
- Optional: `ctx.globalCompositeOperation = 'lighter'` when drawing objects so
  overlapping glows **add up** (ball over its own trail flashes white-hot).
  Cheap and very "neon". Revert to `'source-over'` for background/trail pass.

## Technique 2 — the light trails

Two ways; we use **B** for crisp per-color streaks and it reads exactly as the
brief ("traces based on the color"). **A** is a cheaper alternative if we want
more ambient smear.

### A. Persistence fade (cheap, ambient)
Instead of clearing, paint the field with a translucent black each frame:
```js
ctx.globalCompositeOperation = 'source-over';
ctx.fillStyle = 'rgba(0,0,0,0.18)';   // lower alpha = longer trail
ctx.fillRect(0, 0, W, H);
```
Whatever was drawn last frame survives faintly → every moving colored object
leaves a fading smear **in its own color**. One line, looks great, but the trail
is a soft ghost, not a defined streak, and the score/center line would smear too
(unless you redraw them crisp each frame — which you do, in layer order).

### B. Trail buffer (recommended — defined color-matched streak) ✅
Each moving object keeps its last **N** positions. Each frame, draw connecting
segments with **decreasing width + decreasing alpha** toward the tail, using
the object's neon color → a comet streak.

```js
// push current pos every frame (cap the array):
ball.trail.push({ x: ball.x, y: ball.y });
if (ball.trail.length > TRAIL_LEN) ball.trail.shift();   // ball: 32 frames · paddles: 16

function drawTrail(trail, color) {
  ctx.globalCompositeOperation = 'lighter';   // additive = glowy streak
  ctx.lineCap = 'round';
  for (let i = 1; i < trail.length; i++) {
    const t = i / trail.length;              // 0 = tail, 1 = head
    ctx.globalAlpha = t * 0.55;
    ctx.lineWidth = t *  (r * 1.6) + 1;
    ctx.strokeStyle = color;
    ctx.shadowBlur  = 14 * t;
    ctx.shadowColor = color;
    ctx.beginPath();
    ctx.moveTo(trail[i-1].x, trail[i-1].y);
    ctx.lineTo(trail[i].x,   trail[i].y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
```

- **Per-object color** → ball streaks blue, left paddle cyan, right paddle
  magenta. Exactly the brief.
- Trail length: ball 32 frames (~0.53 s, the long comet), paddles 16
  (~0.27 s wakes), at 60 fps. Ball trail also gets higher alpha (0.85 vs
  0.55), 1.7× width, and a stronger head glow (blur 22 vs 14) — the ball is
  the hero of the effect.
- Paddles trail too (the brief says paddles **and** balls). Their streaks are
  short vertical smears — looks like an energy wake. Cheap: same function.
- On **score / serve**, clear each object's trail so it doesn't streak across
  the field from the reset position.

### Why B over A (or combine)
- A is one line but smears *everything* (including static score/line unless
  carefully layered) and gives a fog, not a streak.
- B is per-object, color-controlled, defined, and you can clear it on resets.
- **Default: B.** If we later want extra ambient bloom, layer A underneath B at a
  low alpha — but don't start there.

## Frame render order (full)

```
source-over :  fill black bg (full clear — B needs a clean clear, not A's fade)
              draw center line (dim, static)
lighter     :  drawTrail(leftPaddle), drawTrail(rightPaddle), drawTrail(ball)
lighter     :  neonRect(leftPaddle), neonRect(rightPaddle), neonCircle(ball)
source-over :  (DOM overlay — score, mode, banner — rendered in HTML, not canvas)
```

Score and banners live in **DOM** over the canvas, not drawn in it → crisp text,
no glow bleed, and they never get smeared by the trail pass.

## Perf note (so it never bites us)

Per frame we draw ≈ 3 trail buffers × ~16 segments + 3 neon shapes ≈ **50
shadowed draw calls**. That is nothing for Canvas2D at 800×500. No offscreen
canvas, no sprite baking, no WebGPU — if profiling ever shows `shadowBlur` cost
(it won't at this entity count), the fix is pre-rendering each glow to a small
offscreen canvas and drawing that. Don't build that now.
