import { LEVELS } from './levels.js';
import { createSim, stepSim, WORLD, BUCKET } from './physics.js';
import { pieceBounds, canFlip, SPINNER } from './pieces.js';
import { initAudio, sfx, setMusic } from './audio.js';
import {
  VIEW, UI, drawLevel, drawLevelSelect, drawTray, drawWinOverlay, drawHand, drawPiece, slotIcon,
} from './render.js';

const STEP = 1 / 60;
const SNAP_RADIUS = 110; // how close a drop must be to a target spot to snap onto it
const DRAG_THRESHOLD = 14; // px of movement before a press counts as a drag rather than a tap
const LIFT = 70; // pieces pulled from the tray float above the finger so they stay visible
const HINT_AFTER_MISSES = 2;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// ------------------------------------------------------------ persistence

function load(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable (private mode); progress just won't persist.
  }
}

// Stars are remembered by level key. Older saves stored positions in the
// original 25 levels, whose keys are a01..a25.
function loadProgress() {
  const p = load('bm-progress-v3', null);
  if (p) return p;
  const old = load('bm-progress-v2', null);
  return { done: (old?.done || []).map((i) => `a${String(i + 1).padStart(2, '0')}`) };
}

// ------------------------------------------------------------ game state

const game = {
  levels: LEVELS,
  levelCount: LEVELS.length,
  screen: 'select', // 'select' (level picker) | 'level'
  page: 0, // level-select page (one per world)
  levelIndex: 0,
  level: LEVELS[0],
  placed: [],
  inventory: [],
  mode: 'edit', // 'edit' | 'run' | 'miss' | 'won'
  sim: null,
  drag: null,
  misses: 0,
  hints: [],
  particles: [],
  ballView: { x: 0, y: 0, rot: 0, vx: 0, vy: 0, squash: 0, visible: true },
  bucketMood: 'idle',
  wonT: 0,
  missT: 0,
  dropT: 0,
  hasRun: false,
  readyToGo: false,
  musicOn: load('bm-music', true),
  progress: loadProgress(), // every level is open; this only tracks stars
};
window.__game = game; // handy for debugging in the browser console

let time = 0;
let acc = 0;

function startLevel(i) {
  game.levelIndex = i;
  game.level = LEVELS[i];
  game.placed = [];
  game.inventory = game.level.tray.map((s) => s.count);
  game.mode = 'edit';
  game.sim = null;
  game.drag = null;
  game.misses = 0;
  game.hints = [];
  game.particles = [];
  game.wonT = 0;
  game.hasRun = false;
  game.screen = 'level';
  resetBall();
}

window.__startLevel = (i) => startLevel(i); // debugging: jump straight to a level

function resetBall() {
  const b = game.level.ball;
  Object.assign(game.ballView, { x: b.x, y: b.y, rot: 0, vx: 0, vy: 0, squash: 0, visible: true, carriedBy: null });
  for (const p of [...game.placed, ...(game.level.fixed || [])]) {
    p.popped = false; // balloons come back
    delete p.spin; // spinners go back to idling
  }
  game.dropT = 0.35;
  game.bucketMood = 'idle';
}

function openSelect() {
  game.screen = 'select';
  game.mode = 'edit';
  game.sim = null;
  game.drag = null;
  game.particles = [];
}

// Open the level picker on the world with the first level not yet completed.
function firstUnfinishedPage() {
  const next = LEVELS.findIndex((l) => !game.progress.done.includes(l.key));
  return next < 0 ? 0 : Math.floor(next / UI.levelsPerPage);
}

function go() {
  if (game.mode === 'edit') {
    game.sim = createSim(game.level, game.placed);
    game.mode = 'run';
    game.hasRun = true;
    acc = 0;
    sfx('go');
  } else if (game.mode === 'run') {
    game.mode = 'edit';
    game.sim = null;
    resetBall();
    sfx('stop');
  }
}

function onWin() {
  game.mode = 'won';
  game.wonT = 0;
  game.bucketMood = 'win';
  sfx('win');
  const b = game.level.bucket;
  burst(b.x, b.y - BUCKET.h, 70, 'confetti');
  burst(b.x, b.y - BUCKET.h, 12, 'star');
  const p = game.progress;
  if (!p.done.includes(game.level.key)) p.done.push(game.level.key);
  save('bm-progress-v3', p);
}

function onMiss() {
  game.mode = 'miss';
  game.missT = 0.9;
  game.misses++;
  sfx('miss');
  const b = game.ballView;
  burst(b.x, b.y, 14, 'puff');
  b.visible = false;
}

function updateHints() {
  if (game.misses < HINT_AFTER_MISSES) {
    game.hints = [];
    return;
  }
  game.hints = game.level.solution.filter(
    (s) => !game.placed.some((p) => p.type === s.type && p.x === s.x && p.y === s.y && p.dir === s.dir),
  );
}

// ------------------------------------------------------------ particles

const CONFETTI = ['#ff4d4d', '#ffd23c', '#34c759', '#48b0ff', '#ff7eb0', '#b77cff'];

function burst(x, y, n, kind) {
  for (let i = 0; i < n; i++) {
    const radial = kind === 'puff' || kind === 'sparkle';
    const a = radial ? Math.random() * Math.PI * 2 : -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
    const sp = kind === 'puff' ? 60 + Math.random() * 120 : kind === 'sparkle' ? 180 + Math.random() * 160 : 500 + Math.random() * 900;
    game.particles.push({
      kind,
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      rot: Math.random() * 6,
      vr: (Math.random() - 0.5) * 12,
      color: CONFETTI[i % CONFETTI.length],
      size: kind === 'puff' ? 20 + Math.random() * 25 : kind === 'sparkle' ? 10 + Math.random() * 6 : 18 + Math.random() * 14,
      life: kind === 'puff' ? 0.7 : kind === 'sparkle' ? 0.45 : 2.2 + Math.random(),
    });
  }
}

function updateParticles(dt) {
  for (const p of game.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.vr * dt;
    if (p.kind === 'puff' || p.kind === 'sparkle') {
      if (p.kind === 'puff') p.size += 50 * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
    } else {
      p.vy += 900 * dt;
      p.vx *= 0.99;
      if (p.kind === 'confetti') p.vy = Math.min(p.vy, 260);
    }
  }
  game.particles = game.particles.filter((p) => p.life > 0);
}

// ------------------------------------------------------------ update

function update(dt) {
  time += dt;
  updateParticles(dt);
  for (const p of game.placed) if (p.squash) p.squash = Math.max(0, p.squash - dt * 4);
  for (const p of game.level.fixed || []) if (p.squash) p.squash = Math.max(0, p.squash - dt * 4);
  if (game.screen !== 'level') return;
  const bv = game.ballView;
  game.readyToGo = game.mode === 'edit' && game.placed.length >= game.level.solution.length;

  if (game.mode === 'run') {
    acc += dt;
    while (acc >= STEP && !game.sim.result) {
      stepSim(game.sim, STEP);
      acc -= STEP;
    }
    for (const e of game.sim.events) {
      if (e.type === 'boing') {
        sfx('boing');
        bv.squash = 1;
        const tramp = nearestPiece('tramp', game.sim.ball.x, game.sim.ball.y);
        if (tramp) tramp.squash = 1;
      } else if (e.type === 'hit') {
        sfx(e.mat === 'bucket' ? 'clank' : 'hit', e.v / 1200);
        bv.squash = Math.min(1, e.v / 1500);
      } else if (e.type === 'bump') {
        sfx('bump');
        bv.squash = 1;
        const bumper = nearestPiece('bumper', e.x, e.y);
        if (bumper) bumper.squash = 1;
      } else if (e.type === 'load') {
        sfx('load');
      } else if (e.type === 'boom') {
        sfx('boom');
        burst(e.x, e.y, 10, 'puff');
        const cannon = nearestPiece('cannon', e.x, e.y);
        if (cannon) cannon.squash = 1;
      } else if (e.type === 'wobble') {
        sfx('wobble');
        bv.squash = 1;
        const jelly = nearestPiece('jelly', e.x, e.y);
        if (jelly) jelly.squash = 1;
      } else if (e.type === 'punch') {
        sfx('punch');
        bv.squash = 1;
        const glove = nearestPiece('glove', e.x, e.y);
        if (glove) glove.squash = 1;
      } else if (e.type === 'pipeOut') {
        sfx('pipeOut');
      } else if (e.type === 'grab') {
        sfx('grab');
        const balloon = nearestPiece('balloon', e.x, e.y);
        if (balloon) balloon.popped = true; // it leaves its spot and rides with the ball
        bv.carriedBy = balloon;
      } else if (e.type === 'pop') {
        sfx('balloonPop');
        burst(e.x, e.y, 10, 'sparkle');
        bv.carriedBy = null;
      } else if (e.type === 'warp') {
        sfx('warp');
        burst(e.x, e.y, 8, 'sparkle');
        burst(e.tx, e.ty, 8, 'sparkle');
      }
    }
    game.sim.events.length = 0;
    const b = game.sim.ball;
    Object.assign(bv, { x: b.x, y: b.y, rot: b.rot, vx: b.vx, vy: b.vy, visible: !b.hidden });
    // Spinners turn with the sim clock so what you see matches what the ball hits.
    for (const p of game.placed) if (p.type === 'spinner') p.spin = p.dir * SPINNER.speed * game.sim.clock;
    bv.squash = Math.max(0, bv.squash - dt * 6);
    const bk = game.level.bucket;
    game.bucketMood = Math.hypot(b.x - bk.x, b.y - (bk.y - BUCKET.h)) < 330 ? 'near' : 'idle';
    if (game.sim.result === 'win') onWin();
    else if (game.sim.result === 'miss') onMiss();
  } else if (game.mode === 'miss') {
    game.missT -= dt;
    if (game.missT <= 0) {
      game.mode = 'edit';
      game.sim = null;
      resetBall();
      sfx('pop');
      updateHints();
    }
  } else if (game.mode === 'won') {
    game.wonT += dt;
    if (Math.random() < dt * 3 && game.wonT < 4) {
      burst(200 + Math.random() * 1200, -20, 6, 'confetti');
    }
  }

  if (game.mode === 'edit') {
    // Ball pops out of the pipe with a little drop, then idles with a bob.
    const start = game.level.ball;
    if (game.dropT > 0) {
      game.dropT = Math.max(0, game.dropT - dt);
      bv.y = start.y - (game.dropT / 0.35) * 70;
    } else {
      bv.y = start.y + Math.sin(time * 3) * 4;
    }
    bv.x = start.x;
  }
}

function nearestPiece(type, x, y) {
  let best = null;
  let bd = Infinity;
  for (const p of [...game.placed, ...(game.level.fixed || [])]) {
    if (p.type !== type) continue;
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return best;
}

// ------------------------------------------------------------ view / resize

let dpr = 1;
let scale = 1;
let offX = 0;
let offY = 0;
let ext = { x0: 0, y0: 0, x1: VIEW.W, y1: VIEW.H };
let viewW = 0;
let viewH = 0;

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  // The window can briefly report no size (page opened in the background, or a
  // home-screen launch still settling). Wait for a real one rather than scale by 0.
  if (!(w > 0 && h > 0)) return;
  viewW = w;
  viewH = h;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  scale = Math.min(w / VIEW.W, h / VIEW.H);
  offX = (w - VIEW.W * scale) / 2;
  offY = (h - VIEW.H * scale) / 2;
  ext = { x0: -offX / scale, y0: -offY / scale, x1: VIEW.W + offX / scale, y1: VIEW.H + offY / scale };
}

function toLogical(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left - offX) / scale, y: (e.clientY - r.top - offY) / scale };
}

// ------------------------------------------------------------ draw

function draw() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * offX, dpr * offY);
  if (game.screen === 'select') {
    drawLevelSelect(ctx, game, time, ext);
    return;
  }
  drawLevel(ctx, game, time, ext);
  drawTray(ctx, game, time, ext);
  if (game.drag) {
    const p = game.drag.piece;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 14;
    drawPiece(ctx, p, time, {});
    ctx.restore();
  }
  drawTutorial();
  if (game.mode === 'won') drawWinOverlay(ctx, game, time, ext);
}

// A hand shows what to do: on tutorial levels from the start, and on any
// level once hints are showing. It drags a piece to its spot, then taps Go.
function drawTutorial() {
  if (game.mode !== 'edit' || game.drag) return;
  const tutorial = game.level.tutorial && !game.hasRun;
  const targets = game.hints.length ? game.hints : tutorial && game.placed.length === 0 ? game.level.solution : [];
  if (targets.length) {
    const sol = targets[0];
    // Start from a misplaced piece of the right type if there is one, else the tray.
    const misplaced = game.placed.find((p) => p.type === sol.type && !(p.x === sol.x && p.y === sol.y && p.dir === sol.dir));
    let from;
    if (misplaced) {
      from = misplaced;
    } else {
      const slotIndex = game.level.tray.findIndex((s) => s.type === sol.type);
      if (game.inventory[slotIndex] <= 0) return;
      from = slotIcon(sol.type, UI.slot(slotIndex, game.level.tray.length));
    }
    if (misplaced && misplaced.x === sol.x && misplaced.y === sol.y) {
      // Right spot, wrong way round: show a tap.
      drawHand(ctx, sol.x, sol.y, Math.sin(time * 8) > 0 ? 1 : 0);
      return;
    }
    const cycle = (time % 2.8) / 2.8;
    const k = cycle < 0.15 ? 0 : cycle > 0.7 ? 1 : easeInOut((cycle - 0.15) / 0.55);
    const x = from.x + (sol.x - from.x) * k;
    const y = from.y + (sol.y - from.y) * k;
    ctx.save();
    ctx.globalAlpha = 0.55;
    drawPiece(ctx, { ...sol, x, y }, time, {});
    ctx.restore();
    drawHand(ctx, x, y + 10, cycle < 0.12 ? 1 : 0);
  } else if ((tutorial || game.misses >= HINT_AFTER_MISSES) && game.readyToGo) {
    drawHand(ctx, UI.go.x, UI.go.y - 30, Math.sin(time * 8) > 0 ? 1 : 0);
  }
}

function easeInOut(x) {
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

// ------------------------------------------------------------ input

let activePointer = null;
let press = null; // { x, y, button } for taps on UI buttons

const inCircle = (p, b, pad = 10) => Math.hypot(p.x - b.x, p.y - b.y) <= b.r + pad;
const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

function hitPlacedPiece(pt) {
  for (let i = game.placed.length - 1; i >= 0; i--) {
    const p = game.placed[i];
    const b = pieceBounds(p);
    const pad = 28; // generous targets for small fingers
    if (pt.x >= b.x0 - pad && pt.x <= b.x1 + pad && pt.y >= b.y0 - pad && pt.y <= b.y1 + pad) return p;
  }
  return null;
}

function buttonAt(pt) {
  if (game.screen === 'select') {
    const pages = Math.ceil(game.levelCount / UI.levelsPerPage);
    if (inCircle(pt, UI.music)) return 'music';
    if (game.page > 0 && inCircle(pt, UI.pagePrev)) return 'prev';
    if (game.page < pages - 1 && inCircle(pt, UI.pageNext)) return 'nextPage';
    for (let i = 0; i < UI.levelsPerPage; i++) {
      const li = game.page * UI.levelsPerPage + i;
      if (li < game.levelCount && inRect(pt, UI.levelBtn(i))) return `level:${li}`;
    }
    return null;
  }
  if (game.mode === 'won' && game.wonT > 1.3) {
    const last = game.levelIndex >= game.levelCount - 1;
    if (inCircle(pt, last ? { ...UI.replay, x: 800 } : UI.replay)) return 'replay';
    if (!last && inCircle(pt, UI.next)) return 'next';
  }
  if (inCircle(pt, UI.home)) return 'home';
  if (inCircle(pt, UI.music)) return 'music';
  if (inCircle(pt, UI.go, 20) && (game.mode === 'edit' || game.mode === 'run')) return 'go';
  return null;
}

function runButton(name) {
  if (name === 'music') {
    game.musicOn = !game.musicOn;
    setMusic(game.musicOn);
    save('bm-music', game.musicOn);
    sfx('tap');
  } else if (name === 'home') {
    sfx('tap');
    game.page = Math.floor(game.levelIndex / UI.levelsPerPage);
    openSelect();
  } else if (name === 'prev' || name === 'nextPage') {
    sfx('flip');
    game.page += name === 'prev' ? -1 : 1;
  } else if (name === 'go') {
    go();
  } else if (name === 'replay') {
    sfx('tap');
    startLevel(game.levelIndex);
  } else if (name === 'next') {
    sfx('unlock');
    startLevel(game.levelIndex + 1);
  } else if (name.startsWith('level:')) {
    sfx('tap');
    startLevel(+name.slice(6));
  }
}

function onDown(e) {
  initAudio(game.musicOn);
  if (activePointer !== null) return;
  activePointer = e.pointerId;
  canvas.setPointerCapture?.(e.pointerId);
  const pt = toLogical(e);

  const btn = buttonAt(pt);
  if (btn) {
    press = { button: btn };
    return;
  }
  if (game.screen !== 'level' || game.mode !== 'edit') return;

  const hit = hitPlacedPiece(pt);
  if (hit && pt.x < UI.trayX) {
    game.drag = { piece: hit, fromTray: false, offX: hit.x - pt.x, offY: hit.y - pt.y, sx: pt.x, sy: pt.y, moved: false };
    return;
  }
  game.level.tray.forEach((slot, i) => {
    if (game.drag || !inRect(pt, UI.slot(i, game.level.tray.length)) || game.inventory[i] <= 0) return;
    game.inventory[i]--;
    const piece = { type: slot.type, x: pt.x, y: pt.y - LIFT, dir: 1, slot: i };
    game.drag = { piece, fromTray: true, offX: 0, offY: -LIFT, sx: pt.x, sy: pt.y, moved: true };
    sfx('pick');
  });
}

function onMove(e) {
  if (e.pointerId !== activePointer || !game.drag) return;
  const pt = toLogical(e);
  const d = game.drag;
  if (!d.moved && Math.hypot(pt.x - d.sx, pt.y - d.sy) > DRAG_THRESHOLD) {
    d.moved = true;
    sfx('pick');
  }
  if (d.moved) {
    d.piece.x = pt.x + d.offX;
    d.piece.y = pt.y + d.offY;
  }
}

function onUp(e) {
  initAudio(game.musicOn); // iOS Safari only unlocks audio on some gesture events
  if (e.pointerId !== activePointer) return;
  activePointer = null;
  const pt = toLogical(e);
  if (press) {
    if (buttonAt(pt) === press.button) runButton(press.button);
    press = null;
    return;
  }
  const d = game.drag;
  if (!d) return;
  game.drag = null;
  const p = d.piece;
  if (!d.moved) {
    if (canFlip(p.type)) {
      p.dir *= -1;
      sfx('flip');
    } else {
      p.squash = 1;
      sfx('boing');
    }
  } else if (pt.x > UI.trayX) {
    // Dropped back on the tray: return it.
    game.placed = game.placed.filter((q) => q !== p);
    game.inventory[p.slot]++;
    sfx('return');
  } else {
    clampPiece(p);
    const snapped = snapPiece(p);
    if (d.fromTray) game.placed.push(p);
    sfx(snapped ? 'snap' : 'drop');
    if (snapped) burst(p.x, p.y, 10, 'sparkle');
  }
  updateHints();
}

function onCancel(e) {
  if (e.pointerId !== activePointer) return;
  activePointer = null;
  press = null;
  const d = game.drag;
  if (d) {
    game.drag = null;
    if (d.fromTray) game.inventory[d.piece.slot]++;
  }
}

function clampPiece(p) {
  let b = pieceBounds(p);
  if (b.x0 < 10) p.x += 10 - b.x0;
  if (b.x1 > WORLD.W - 10) p.x -= b.x1 - (WORLD.W - 10);
  if (b.y0 < 10) p.y += 10 - b.y0;
  b = pieceBounds(p);
  if (b.y1 > WORLD.FLOOR) p.y -= b.y1 - WORLD.FLOOR;
  // Trampolines dropped near the ground settle onto it.
  b = pieceBounds(p);
  if (p.type === 'tramp' && WORLD.FLOOR - b.y1 < 90) p.y += WORLD.FLOOR - b.y1;
  p.x = Math.round(p.x);
  p.y = Math.round(p.y);
}

// Dropping near a target spot snaps the piece exactly onto it, so small hands
// don't need pixel precision.
function snapPiece(p) {
  for (const s of game.level.solution) {
    if (s.type !== p.type) continue;
    if (Math.hypot(p.x - s.x, p.y - s.y) > SNAP_RADIUS) continue;
    const taken = game.placed.some((q) => q !== p && q.type === s.type && q.x === s.x && q.y === s.y);
    if (taken) continue;
    p.x = s.x;
    p.y = s.y;
    return true;
  }
  return false;
}

canvas.addEventListener('pointerdown', onDown);
canvas.addEventListener('pointermove', onMove);
canvas.addEventListener('pointerup', onUp);
canvas.addEventListener('pointercancel', onCancel);
// Block iOS pinch-zoom / double-tap zoom and the long-press menu.
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));

// ------------------------------------------------------------ loop

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame); // first, so one bad frame can't stop the game
  const dt = Math.min(1 / 30, (now - last) / 1000);
  last = now;
  // Resize events aren't reliable on phones (rotation, home-screen launch), so check each frame.
  if (window.innerWidth !== viewW || window.innerHeight !== viewH) resize();
  if (!viewW) return;
  update(dt);
  draw();
}

resize();
game.page = firstUnfinishedPage();
requestAnimationFrame(frame);

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
