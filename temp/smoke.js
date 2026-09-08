// Headless smoke test — runs the real code/game.js against a stubbed DOM and
// plays out a full Normal match (no paddle moves), then Endless, asserting
// scoring, strict-11 win, rematch, and menu transitions.
// Run: node temp/smoke.js
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

// ---- minimal DOM/canvas stubs
const els = {};
const mkEl = () => ({ textContent: '', style: {}, classList: { toggle() {} } });
const ctx = new Proxy({}, {
  get(t, p) { return p in t ? t[p] : () => {}; },
  set(t, p, v) { t[p] = v; return true; },
});
const canvas = { width: 0, height: 0, getContext: () => ctx };
const listeners = {};
let rafCb = null;

globalThis.devicePixelRatio = 1;
const src = fs.readFileSync(path.join(__dirname, '..', 'code', 'game.js'), 'utf8');
const game = new Function(
  'window', 'document', 'addEventListener', 'requestAnimationFrame',
  src + '\n;return { state: () => state, score: () => score, pointMsg: () => pointMsg, mode: () => mode, opp: () => opp, ball: () => ball, left: () => left, right: () => right };\n'
)(
  globalThis,
  { getElementById: id => id === 'game' ? canvas : (els[id] || (els[id] = mkEl())) },
  (ev, fn) => { listeners[ev] = fn; },
  cb => { rafCb = cb; }
);

// ---- drive the loop
// The test drives no input. Stationary centered paddles legally rally
// forever, so: h=0 shrinks the collision to a 2r band, and y is forced to
// the top edge per serve (bands sit at y=[-8,8]; the ball's worst-case y
// at paddle x is [19,481] — clear by construction). Every serve ends in a point.
game.left().h = 0; game.right().h = 0;
let t = performance.now() + 1000;
const step = ms => { t += ms; rafCb(t); };
const key = code => listeners.keydown({ code, repeat: false, preventDefault() {} });
function playToNext(timeoutMs = 8000) {
  game.left().y = -1e4; game.right().y = -1e4;   // clamped to top edge on frame 1
  for (let i = 0; i < timeoutMs / 16.7; i++) {
    if (game.state() !== 'play') return;
    step(16.7);
  }
  throw new Error('ball never left the field');
}

// 1. boot in menu
assert.strictEqual(game.state(), 'menu');
// 2. start Normal, serve
key('Enter'); assert.strictEqual(game.state(), 'serve');
key('Space'); assert.strictEqual(game.state(), 'play');
// 3. no paddles → ball exits → 1 score, trails cleared
playToNext();
assert.strictEqual(game.score().l + game.score().r, 1);
assert.strictEqual(game.state(), 'point');
assert.strictEqual(game.ball().trail.length, 0);
// 4. point-end delay → back to serve
for (let i = 0; i < 120; i++) step(16.7);
assert.strictEqual(game.state(), 'serve');
// 5. keep scoring until strict-11 win
let guard = 0;
while (game.state() !== 'over' && guard++ < 20) {
  key('Space'); assert.strictEqual(game.state(), 'play');
  playToNext();
  assert.notStrictEqual(game.state(), 'play');
  if (game.state() === 'over') break;
  for (let i = 0; i < 120; i++) step(16.7);
}
const s = game.score();
assert.ok(s.l === 11 || s.r === 11, 'a side must reach exactly 11, got ' + JSON.stringify(s));
assert.strictEqual(game.state(), 'over');
assert.ok(game.pointMsg().includes('WINS'), game.pointMsg());
const winL = game.score().l, winR = game.score().r;
// 6. rematch + quit to menu
key('Enter');
assert.strictEqual(game.state(), 'serve');
assert.strictEqual(game.score().l + game.score().r, 0);
key('Escape');
assert.strictEqual(game.state(), 'menu');
// 7. endless (2 players): 4 points, never 'over', Esc → menu
key('Digit3');
assert.strictEqual(game.mode(), 'endless');
assert.strictEqual(game.opp(), 'human');
key('Enter'); key('Space');
for (let i = 0; i < 4; i++) {
  playToNext();
  assert.notStrictEqual(game.state(), 'over', 'endless must never end');
  for (let j = 0; j < 120; j++) step(16.7);
  assert.strictEqual(game.state(), 'serve');
  key('Space');
}
key('Escape');
assert.strictEqual(game.state(), 'menu');
// 8. AI opponent: right paddle must track the ball
key('Digit4');
assert.strictEqual(game.mode(), 'endless');
assert.strictEqual(game.opp(), 'ai');
key('Enter'); key('Space');
game.ball().vy = -60;                  // deterministic upward drift
let minY = 1e9;
for (let i = 0; i < 200; i++) {
  step(16.7);
  minY = Math.min(minY, game.right().y);
}
assert.ok(minY < 245, 'AI paddle must track the ball (min y ' + minY.toFixed(1) + ')');
key('Escape');
assert.strictEqual(game.state(), 'menu');

console.log('PASS — menu → Normal to 11 (win %d:%d) → rematch → Endless 2P (no win) → AI tracks ball → menu', winL, winR);
