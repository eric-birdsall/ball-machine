// Level generator. Builds a level around a "recipe" (which pieces, in the
// order the ball meets them) by following the ball:
//   1. drop each piece where the ball will run into it
//   2. put the bucket where the ball finally comes down
//   3. add scenery that stays clear of the ball's path
// and keeps the result only if it passes the same checks as hand-made levels.
import { createSim, stepSim, runToEnd, WORLD, BALL_R, BUCKET } from '../js/physics.js';
import { pieceBounds } from '../js/pieces.js';
import { placementIssues } from './lib.mjs';

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NOWHERE = { x: -5000, y: WORLD.FLOOR }; // bucket parked off-screen while we follow the ball
const round10 = (v) => Math.round(v / 10) * 10;

function trace(level, pieces) {
  const sim = createSim(level, pieces);
  const samples = [];
  while (!sim.result) {
    stepSim(sim, 1 / 60);
    const b = sim.ball;
    samples.push({ t: sim.clock, x: b.x, y: b.y, vx: b.vx, vy: b.vy });
  }
  return { sim, samples };
}

// Where a piece goes relative to the point just under the ball, so the ball meets it.
// `d` is the piece's direction, `m` the ball's direction of travel.
const OFFSET = {
  ramp: (d) => [d * 60, 33],
  plank: (d, m) => [m * 70, 9],
  tramp: () => [0, 30],
  conveyor: (d) => [d * 90, 18],
  escalator: (d) => [d * 95, -28],
  bumper: (d) => [-d * 38, 40],
  jelly: () => [0, 50],
  funnel: () => [0, 75],
  slide: (d) => [d * 70, 60],
  cannon: () => [0, 15],
  pipe: () => [0, 55],
  balloon: () => [0, -20],
  portal: () => [0, -10],
  cloud: () => [0, 40],
  magnet: (d) => [d * 260, 60],
  fan: (d) => [-d * 130, 60],
  glove: (d) => [-d * 75, 10],
  blower: (d, m) => [m * 50, 220],
  spinner: (d) => [d * 45, 140],
  block: (d, m) => [m * 125, -30],
};
const NEEDS_SPEED = { plank: 220, blower: 250, block: 260, tramp: 110, jelly: 150 }; // min sideways speed for the piece to make sense
const DIRECTED = new Set(['ramp', 'conveyor', 'escalator', 'bumper', 'slide', 'cannon', 'pipe', 'balloon', 'magnet', 'fan', 'glove', 'spinner']);

function sameTouches(a, b, upTo) {
  for (let i = 0; i < upTo; i++) if (Math.abs((a[i] ?? -1) - (b[i] ?? -1)) > 1e-6) return false;
  return true;
}

// Try to build one level. Returns null when this random attempt doesn't work out.
export function generate(recipe, seed, why = {}) {
  const fail = (r) => ((why[r] = (why[r] || 0) + 1), null);
  const R = rng(seed);
  const pick = (lo, hi) => lo + R() * (hi - lo);
  const side = R() < 0.5 ? 1 : -1; // which way the machine flows overall
  const level = { ball: { x: 0, y: 150 }, walls: [], blocks: [], bucket: NOWHERE, fixed: [] };

  // Start: a plain drop, or a shelf the ball rolls off (gives it sideways speed).
  const start = recipe.start ?? (NEEDS_SPEED[recipe.pieces[0]] ? 'shelf' : R() < 0.35 ? 'shelf' : 'drop');
  if (start === 'shelf') {
    level.ball.x = round10(side > 0 ? pick(150, 420) : pick(1180, 1450));
    const len = pick(300, 420);
    const y0 = round10(pick(250, 330));
    const x0 = level.ball.x - side * 100;
    level.walls.push([x0, y0, round10(x0 + side * len), round10(y0 + pick(60, 110)), 12]);
  } else {
    level.ball.x = round10(side > 0 ? pick(180, 700) : pick(900, 1420));
  }

  const pieces = [];
  let prevEnd = 0.2;
  for (let k = 0; k < recipe.pieces.length; k++) {
    const type = recipe.pieces[k];
    const { sim, samples } = trace(level, pieces);
    const first = sim.firstTouch.slice();
    let placed = null;
    // A shelf start needs a longer look ahead: the ball is still rolling on the shelf at first.
    const horizon = k === 0 && level.walls.length ? 2.2 : 0.8;
    for (let attempt = 0; attempt < 40 && !placed; attempt++) {
      const ts = prevEnd + pick(0.12, horizon);
      const st = samples.find((s) => s.t >= ts);
      if (!st || st.x < 130 || st.x > 1470 || st.y < 170 || st.y > 880) { fail('sample'); continue; }
      if (NEEDS_SPEED[type] && Math.abs(st.vx) < NEEDS_SPEED[type]) { fail('slow'); continue; }
      const m = Math.sign(st.vx) || side;
      // Send the ball toward whichever side has more room.
      const d = DIRECTED.has(type) ? (st.x < 500 ? 1 : st.x > 1100 ? -1 : R() < 0.7 ? side : -side) : 1;
      const [ox, oy] = OFFSET[type](d, m);
      // Put the piece right where the ball is at that moment; a gap below would let
      // a sideways-moving ball drift past it.
      const gap = pick(0, 18);
      const p = { type, x: round10(st.x + ox + pick(-25, 25)), y: round10(st.y + BALL_R + gap + oy), dir: d };
      const trial = [...pieces, p];
      const extraFixed = [];
      if (type === 'portal') {
        // The ball goes in here and comes out of a fixed portal somewhere else.
        const ex = round10(st.x < 800 ? pick(st.x + 420, 1450) : pick(150, st.x - 420));
        extraFixed.push({ type: 'portal', x: ex, y: round10(pick(200, 480)), dir: 1 });
      }
      const lv = { ...level, fixed: [...level.fixed, ...extraFixed] };
      if (placementIssues(lv, trial).length) { fail('overlap'); continue; }
      const r = trace(lv, trial);
      const ft = r.sim.firstTouch;
      if (ft[k] === undefined || ft[k] < prevEnd - 0.05) { fail('untouched'); continue; } // ball never met it, or met it too early
      if (!sameTouches(ft, first, k)) { fail('interferes'); continue; } // it got in the way of an earlier piece
      // The ball has to carry on afterwards, not get stuck on the piece.
      const lt = r.sim.lastTouch[k];
      const after = r.samples.filter((s) => s.t > lt + 0.25);
      if (!after.some((s) => Math.hypot(s.x - p.x, s.y - p.y) > 230)) { fail('stuck'); continue; }
      if (r.samples.some((s) => s.y < -100)) continue;
      placed = p;
      level.fixed = lv.fixed;
      prevEnd = lt;
    }
    if (!placed) return fail(`place:${type}`);
    pieces.push(placed);
  }

  // Bucket: where the ball comes down after the last piece.
  const { sim, samples } = trace(level, pieces);
  const tL = Math.max(...sim.lastTouch.filter((v) => v !== undefined));
  const falling = samples.filter((s) => s.t > tL + 0.3 && s.vy > 180 && s.x > 150 && s.x < 1450 && Math.abs(s.x - level.ball.x) > 190);
  if (!falling.length) return fail('nofall');
  let bucket;
  const elevated = falling.filter((s) => s.y > 380 && s.y < 720);
  if (R() < 0.45 && elevated.length) {
    const s = elevated[Math.floor(R() * elevated.length)];
    const rim = round10(s.y + 50);
    bucket = { x: round10(s.x + s.vx * 0.04), y: Math.min(WORLD.FLOOR, rim + BUCKET.h), vx: s.vx };
  } else {
    const s = falling.find((q) => q.y > WORLD.FLOOR - BUCKET.h - BALL_R - 20);
    if (!s) return fail('nofloor');
    bucket = { x: round10(s.x + s.vx * 0.04), y: WORLD.FLOOR, vx: s.vx };
  }
  if (bucket.x < 130 || bucket.x > 1470) return fail('bucketx');
  level.bucket = { x: bucket.x, y: bucket.y };
  if (bucket.y < WORLD.FLOOR) level.blocks.push([bucket.x - 110, bucket.y, 220, WORLD.FLOOR - bucket.y]); // pedestal
  if (Math.abs(bucket.vx) > 220) {
    // backboard on the far side, so a fast ball doesn't skip over
    const top = bucket.y - BUCKET.h - 200;
    const bx = bucket.vx > 0 ? bucket.x + 118 : bucket.x - 118 - 44;
    if (bx > 0 && bx + 44 < WORLD.W) level.blocks.push([bx, top, 44, WORLD.FLOOR - top]);
  }
  if (!verify(level, pieces)) return fail('verify');

  // Scenery that the ball never comes near.
  const path = trace(level, pieces).samples;
  const want = recipe.scenery ?? 2;
  for (let tries = 0, added = 0; tries < 40 && added < want; tries++) {
    const w = round10(pick(60, 130));
    const h = round10(pick(160, 520));
    const x = round10(pick(60, WORLD.W - 60 - w));
    const blk = [x, WORLD.FLOOR - h, w, h];
    if (!sceneryOk(level, pieces, path, blk)) continue;
    const lv = { ...level, blocks: [...level.blocks, blk] };
    if (!verify(lv, pieces)) continue;
    level.blocks = lv.blocks;
    added++;
  }

  // How forgiving is it? Nudge each piece a little and see how often it still wins.
  let ok = 0;
  let n = 0;
  for (let i = 0; i < pieces.length; i++)
    for (const [dx, dy] of [[-10, 0], [10, 0], [0, -10], [0, 10]]) {
      n++;
      const nudged = pieces.map((p, j) => (j === i ? { ...p, x: p.x + dx, y: p.y + dy } : p));
      if (runToEnd(level, nudged).result === 'win') ok++;
    }
  const run = runToEnd(level, pieces);

  const tray = [];
  for (const p of pieces) {
    const slot = tray.find((s) => s.type === p.type);
    if (slot) slot.count++;
    else tray.push({ type: p.type, count: 1 });
  }
  for (const type of recipe.decoys || []) if (!tray.some((s) => s.type === type)) tray.push({ type, count: 1 });

  const out = { key: recipe.key, ball: level.ball, walls: level.walls, blocks: level.blocks, bucket: level.bucket };
  if (level.fixed.length) out.fixed = level.fixed;
  out.tray = tray;
  out.solution = pieces;
  return { level: out, score: ok / n, time: run.t };
}

function verify(level, pieces) {
  if (placementIssues(level, pieces).length) return false;
  const run = runToEnd(level, pieces);
  if (run.result !== 'win' || run.t < 1.5 || run.t > 9) return false;
  if (pieces.some((_, i) => run.firstTouch[i] === undefined)) return false;
  if (runToEnd(level, []).result !== 'miss') return false;
  for (let i = 0; i < pieces.length; i++) if (runToEnd(level, pieces.filter((_, j) => j !== i)).result !== 'miss') return false;
  // same-type pieces need distinct snap spots
  for (let i = 0; i < pieces.length; i++)
    for (let j = i + 1; j < pieces.length; j++)
      if (pieces[i].type === pieces[j].type && Math.hypot(pieces[i].x - pieces[j].x, pieces[i].y - pieces[j].y) <= 220) return false;
  return true;
}

function sceneryOk(level, pieces, path, [x, y, w, h]) {
  const pad = BALL_R + 40;
  for (const s of path) if (s.x > x - pad && s.x < x + w + pad && s.y > y - pad) return false;
  const near = (b, p) => x < b.x1 + p && x + w > b.x0 - p && y < b.y1 + p;
  for (const p of [...pieces, ...(level.fixed || [])]) if (near(pieceBounds(p), 40)) return false;
  for (const k of level.blocks) if (x < k[0] + k[2] + 60 && x + w > k[0] - 60) return false;
  for (const wl of level.walls) if (x < Math.max(wl[0], wl[2]) + 50 && x + w > Math.min(wl[0], wl[2]) - 50 && y < Math.max(wl[1], wl[3]) + 80) return false;
  if (Math.abs(x + w / 2 - level.ball.x) < 140) return false; // not under the pipe
  const bk = level.bucket;
  if (x < bk.x + 190 && x + w > bk.x - 190) return false;
  return true;
}

// Best of several random attempts for one recipe.
export function best(recipe, { tries = 600, keep = 6 } = {}) {
  const base = recipe.seed ?? [...recipe.key].reduce((a, c) => a * 31 + c.charCodeAt(0), 7);
  const found = [];
  const why = {};
  for (let i = 0; i < tries && found.length < keep; i++) {
    const g = generate(recipe, base * 1000 + i, why);
    if (g && g.score >= (recipe.minScore ?? 0.5)) found.push(g);
  }
  found.sort((a, b) => b.score - a.score);
  if (!found.length && process.env.GEN_DEBUG) console.log('  why:', JSON.stringify(why));
  return found[recipe.pick ?? 0] ?? null;
}
