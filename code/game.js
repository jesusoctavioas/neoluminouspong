'use strict';
// Neoluminous Pong — vanilla Canvas2D PoC.
// Sections: 1 constants · 2 canvas+dom · 3 state · 4 input · 5 audio
//           6 update · 7 render · 8 loop
// Spec: docs/PLAN.md · rendering: docs/NEON-RENDERING.md

// ── 1. CONSTANTS ─────────────────────────────────────────────────────────
const W = 800, H = 500;
const C = { bg: '#000000', left: '#00f0ff', right: '#ff2bd6', ball: '#4d7cff', center: '#1b2b55' };
const PADDLE_SPEED = 450;           // px/s
const SERVE_SPEED  = 140;           // px/s
const SERVE_ANGLE  = 30 * Math.PI / 180;  // random serve heading within ±30°
const HIT_SPEEDUP  = 1.06;
const SPEED_CAP    = 600;
const MAX_ANGLE    = 60 * Math.PI / 180;  // max deflection off a paddle
const TRAIL_LEN    = 16;            // frames of history (paddles)
const BALL_TRAIL_LEN = 32;          // ball gets twice the history — longer comet
const GLOW_SHAPE   = 18;            // shadowBlur for shapes
const GLOW_TRAIL   = 14;            // shadowBlur at trail head (paddles)
const GLOW_TRAIL_BALL = 22;         // stronger glow at the ball trail head
const POINT_END_DELAY = 1.0;        // s
const WIN_SCORE    = 11;            // strict first-to-11 (Normal mode)
const AUD = { paddle: 520, wall: 260, score: 880, serve: 330 };  // Hz, ~60 ms sine
// AI difficulty: EASY is slow and sloppy, MEDIUM is the old feel softened,
// HARD is the previous 400/6 behavior — the one that felt too strong.
const AI = {
  easy:   { speed: 220, dead: 20 },
  medium: { speed: 330, dead: 10 },
  hard:   { speed: 430, dead: 4 },
};
// Menu rows — key 1..8. [matchLength, opponent, aiDifficulty]
const MODES = [
  ['normal',  'human', null],       // 1 · HUMAN VS HUMAN
  ['normal',  'ai',    'easy'],     // 2 · VS COMPUTER — EASY
  ['normal',  'ai',    'medium'],   // 3 · VS COMPUTER — MEDIUM
  ['normal',  'ai',    'hard'],     // 4 · VS COMPUTER — HARD
  ['endless', 'human', null],       // 5 · ENDLESS — 2 PLAYERS
  ['endless', 'ai',    'easy'],     // 6 · ENDLESS VS COMPUTER — EASY
  ['endless', 'ai',    'medium'],   // 7 · ENDLESS VS COMPUTER — MEDIUM
  ['endless', 'ai',    'hard'],     // 8 · ENDLESS VS COMPUTER — HARD
];

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

// ── 2. CANVAS + DOM ──────────────────────────────────────────────────────
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const dpr = window.devicePixelRatio || 1;
canvas.width = W * dpr; canvas.height = H * dpr;
ctx.scale(dpr, dpr);

const el = {
  scoreL: document.getElementById('score-l'),
  scoreR: document.getElementById('score-r'),
  mode:   document.getElementById('mode'),
  banner: document.getElementById('banner'),
  menu:   document.getElementById('menu'),
  opt: [1, 2, 3, 4, 5, 6, 7, 8].map(n => document.getElementById('opt-' + n)),
};

// ── 3. STATE ─────────────────────────────────────────────────────────────
const ST = { MENU: 'menu', SERVE: 'serve', PLAY: 'play', POINT: 'point', OVER: 'over' };
let state = ST.MENU;
let mode = 'normal';                 // 'normal' | 'endless'
let opp = 'human';                   // right paddle: 'human' | 'ai'
let diff = null;                     // 'easy' | 'medium' | 'hard' | null (no AI)
let sel = 0;                         // selected menu row (0-based)
let paused = false;
let pointTimer = 0;
let pointMsg = '';
let serveDir = -1;                   // +1 toward right side, -1 toward left

const left  = { x: 20, y: H / 2 - 40, w: 12, h: 80, color: C.left,  name: 'CYAN',    trail: [] };
const right = { x: W - 32, y: H / 2 - 40, w: 12, h: 80, color: C.right, name: 'MAGENTA', trail: [] };
const ball  = { x: W / 2, y: H / 2, r: 8, vx: 0, vy: 0, speed: SERVE_SPEED, color: C.ball, trail: [] };
const score = { l: 0, r: 0 };

// ── 4. INPUT ─────────────────────────────────────────────────────────────
const keys = new Set();
addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'ArrowDown') e.preventDefault();
  initAudio();
  if (!e.repeat) onKeyDown(e.code);
  keys.add(e.code);
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

function onKeyDown(code) {
  if (state === ST.MENU) {
    if (code >= 'Digit1' && code <= 'Digit8') select(+code.slice(5) - 1);   // 0-based row
    else if (code === 'ArrowUp')    select(sel - 1);          // wraps around
    else if (code === 'ArrowDown')  select(sel + 1);
    else if (code === 'Enter') startMatch();
  } else if (state === ST.SERVE) {
    if (code === 'Space') serve();
    else if (code === 'Escape') toMenu();
  } else if (state === ST.PLAY) {
    if (code === 'Space') { paused = !paused; syncUI(); }
    else if (code === 'Escape') toMenu();
  } else if (state === ST.POINT && code === 'Escape') {
    toMenu();
  } else if (state === ST.OVER) {
    if (code === 'Enter') startMatch();
    else if (code === 'Escape') toMenu();
  }
}

function select(i) {
  sel = (i + MODES.length) % MODES.length;                  // wrap both ways
  const m = MODES[sel];
  mode = m[0]; opp = m[1]; diff = m[2];
  syncUI();
}
function toMenu() { state = ST.MENU; paused = false; syncUI(); }

function startMatch() {
  score.l = 0; score.r = 0;
  serveDir = -1;                        // first serve heads toward left side
  toServe();
}

function toServe() {
  paused = false;
  resetBall();
  left.y = H / 2 - left.h / 2;          // classic: paddles re-center per serve
  right.y = H / 2 - right.h / 2;
  clearTrails();
  state = ST.SERVE;
  syncUI();
}

function resetBall() {
  ball.x = W / 2; ball.y = H / 2;
  ball.vx = 0; ball.vy = 0; ball.speed = SERVE_SPEED;
}

function serve() {
  const a = (Math.random() * 2 - 1) * SERVE_ANGLE;
  ball.vx = Math.cos(a) * ball.speed * serveDir;
  ball.vy = Math.sin(a) * ball.speed;
  state = ST.PLAY;
  blip(AUD.serve);
  syncUI();
}

function pointScored(side) {            // side that just scored: 'l' | 'r'
  score[side]++;
  blip(AUD.score);
  resetBall();
  clearTrails();
  serveDir = side === 'l' ? 1 : -1;     // next serve heads toward the loser
  const scorer = side === 'l' ? left.name : right.name;
  if (mode === 'normal' && score[side] >= WIN_SCORE) {
    pointMsg = scorer + ' WINS';
    state = ST.OVER;
  } else {
    pointMsg = scorer + ' SCORES';
    pointTimer = POINT_END_DELAY;
    state = ST.POINT;
  }
  syncUI();
}

function clearTrails() {
  left.trail.length = 0; right.trail.length = 0; ball.trail.length = 0;
}

// ── 5. AUDIO (lazy: context born on first keypress — autoplay policy) ────
let ac = null;
function initAudio() {
  if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } }
  if (ac && ac.state === 'suspended') ac.resume();
}
function blip(freq) {
  if (!ac) return;
  const t = ac.currentTime;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = 'sine'; o.frequency.value = freq;
  g.gain.setValueAtTime(0.08, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  o.connect(g); g.connect(ac.destination);
  o.start(t); o.stop(t + 0.07);
}

// ── 6. UPDATE ────────────────────────────────────────────────────────────
function update(dt) {
  if ((state === ST.SERVE || state === ST.PLAY) && !paused) {
    movePaddle(left,  PADDLE_SPEED * dt * ((keys.has('KeyS') ? 1 : 0) - (keys.has('KeyW') ? 1 : 0)));
    if (opp === 'ai') moveAI(right, dt);
    else movePaddle(right, PADDLE_SPEED * dt * ((keys.has('ArrowDown') ? 1 : 0) - (keys.has('ArrowUp') ? 1 : 0)));
    for (const p of [left, right]) {
      p.trail.push({ x: p.x + p.w / 2, y: p.y + p.h / 2 });
      if (p.trail.length > TRAIL_LEN) p.trail.shift();
    }
  }
  if (state === ST.PLAY && !paused) updateBall(dt);
  if (state === ST.POINT) { pointTimer -= dt; if (pointTimer <= 0) toServe(); }
}

function movePaddle(p, dy) { p.y = clamp(p.y + dy, 0, H - p.h); }

// Computer pilot (right paddle): tracks the ball through its center with a
// dead-zone so it doesn't jitter, and moves at AI_SPEED (< PADDLE_SPEED) so a
// fast angled rally still beats it.
function moveAI(p, dt) {
  const a = AI[diff];
  const d = ball.y - (p.y + p.h / 2);
  if (Math.abs(d) <= a.dead) return;
  movePaddle(p, Math.sign(d) * Math.min(a.speed * dt, Math.abs(d)));
}

function updateBall(dt) {
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  ball.trail.push({ x: ball.x, y: ball.y });
  if (ball.trail.length > BALL_TRAIL_LEN) ball.trail.shift();

  // wall bounce (abs() guards against double-flip if a frame overshoots)
  if (ball.y - ball.r < 0)      { ball.y = ball.r;    ball.vy = Math.abs(ball.vy);  blip(AUD.wall); }
  else if (ball.y + ball.r > H) { ball.y = H - ball.r; ball.vy = -Math.abs(ball.vy); blip(AUD.wall); }

  hitPaddle(left, +1);
  hitPaddle(right, -1);

  // score: ball fully out
  if (ball.x < -ball.r) pointScored('r');
  else if (ball.x > W + ball.r) pointScored('l');
}

// outDir: direction the ball leaves after the hit (+1 left paddle, -1 right)
function hitPaddle(p, outDir) {
  if (outDir > 0 ? ball.vx >= 0 : ball.vx <= 0) return;      // must be approaching
  const front = outDir > 0 ? p.x + p.w : p.x;
  const cross  = outDir > 0 ? ball.x - ball.r < front  : ball.x + ball.r > front;
  const behind = outDir > 0 ? ball.x - ball.r > p.x - 2 : ball.x + ball.r < p.x + p.w + 2;
  if (!cross || !behind) return;                              // catch window (anti-tunnel)
  if (ball.y < p.y - ball.r || ball.y > p.y + p.h + ball.r) return;

  const rel = clamp((ball.y - (p.y + p.h / 2)) / (p.h / 2), -1, 1);
  const ang = rel * MAX_ANGLE;
  ball.speed = Math.min(ball.speed * HIT_SPEEDUP, SPEED_CAP);
  ball.vx = Math.cos(ang) * ball.speed * outDir;
  ball.vy = Math.sin(ang) * ball.speed;
  ball.x  = outDir > 0 ? front + ball.r : front - ball.r;     // un-tunnel
  blip(AUD.paddle);
}

// ── 7. RENDER ────────────────────────────────────────────────────────────
function render() {
  // full clear on black
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);

  // dim static dashed center line
  ctx.strokeStyle = C.center;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 12]);
  ctx.beginPath();
  ctx.moveTo(W / 2, 0);
  ctx.lineTo(W / 2, H);
  ctx.stroke();
  ctx.setLineDash([]);

  // additive pass: trails first (under), glowing shapes on top
  ctx.globalCompositeOperation = 'lighter';
  drawTrail(left.trail, left.color,  1.0, 0.55, GLOW_TRAIL);
  drawTrail(right.trail, right.color, 1.0, 0.55, GLOW_TRAIL);
  drawTrail(ball.trail, ball.color,  1.7, 0.85, GLOW_TRAIL_BALL);
  neonRect(left);
  neonRect(right);
  neonCircle(ball);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}

function drawTrail(tr, color, wMul, alpha, glow) {
  if (tr.length < 2) return;
  ctx.lineCap = 'round';
  ctx.strokeStyle = color;
  for (let i = 1; i < tr.length; i++) {
    const t = i / tr.length;                                   // 0 tail → 1 head
    ctx.globalAlpha = t * alpha;
    ctx.lineWidth = t * ball.r * 1.6 * wMul + 1;
    ctx.shadowBlur = glow * t;
    ctx.shadowColor = color;
    ctx.beginPath();
    ctx.moveTo(tr[i - 1].x, tr[i - 1].y);
    ctx.lineTo(tr[i].x, tr[i].y);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

// double fill: first pass builds the halo, second a hot core
function neonRect(p) {
  ctx.shadowBlur = GLOW_SHAPE;
  ctx.shadowColor = p.color;
  ctx.fillStyle = p.color;
  ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.fillRect(p.x, p.y, p.w, p.h);
}

function neonCircle(b) {
  ctx.shadowBlur = GLOW_SHAPE;
  ctx.shadowColor = b.color;
  ctx.fillStyle = b.color;
  ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
}

// all text lives in the DOM — crisp, never smeared by the trail pass
function syncUI() {
  el.scoreL.textContent = score.l;
  el.scoreR.textContent = score.r;
  el.mode.textContent = mode.toUpperCase() + (opp === 'ai' ? ' · CPU · ' + diff.toUpperCase() : '');
  el.mode.style.visibility = state === ST.MENU ? 'hidden' : 'visible';
  el.opt.forEach((o, i) => o.classList.toggle('sel', i === sel));
  el.menu.classList.toggle('hidden', state !== ST.MENU);
  let msg = '';
  if (state === ST.SERVE) msg = 'SPACE TO SERVE';
  else if (state === ST.POINT) msg = pointMsg;
  else if (state === ST.OVER) msg = pointMsg + '   ·   ENTER REMATCH · ESC MENU';
  else if (state === ST.PLAY && paused) msg = 'PAUSED';
  el.banner.textContent = msg;
  el.banner.style.visibility = msg ? 'visible' : 'hidden';
}

// ── 8. MAIN LOOP ─────────────────────────────────────────────────────────
let last = performance.now();
function frame(t) {
  const dt = Math.min((t - last) / 1000, 1 / 30);   // clamp tab-away spikes
  last = t;
  update(dt);
  render();
  requestAnimationFrame(frame);
}
syncUI();
requestAnimationFrame(frame);
