// A tiny purpose-built physics sim: one ball against static shapes.
// Pure module (no DOM) so the level tests can run it in Node.
import { pieceShapes, TRAMP, FAN, BUMPER, MAGNET, CANNON, PORTAL } from './pieces.js';

export const WORLD = { W: 1600, H: 1080, FLOOR: 1040 };
export const BALL_R = 34;
export const BUCKET = { w: 220, h: 170, r: 10 };

const G = 1500;
const SUBSTEPS = 10;
const RESTITUTION = 0.25;
const MAX_SPEED = 2600;
const MAX_TIME = 14;
const MAX_BOINGS = 5; // endless trampoline bouncing counts as a miss

const seg = (ax, ay, bx, by, r, mat = 'wood') => ({ kind: 'seg', ax, ay, bx, by, r, mat });
const box = (x, y, w, h, mat = 'solid') => ({ kind: 'box', x, y, w, h, mat });

export function bucketShapes(b) {
  const hw = BUCKET.w / 2;
  const { h, r } = BUCKET;
  return [
    seg(b.x - hw, b.y - h, b.x - hw + 12, b.y, r, 'bucket'),
    seg(b.x + hw, b.y - h, b.x + hw - 12, b.y, r, 'bucket'),
    seg(b.x - hw + 12, b.y - r, b.x + hw - 12, b.y - r, r, 'bucket'),
  ];
}

export function levelShapes(level) {
  const shapes = [
    box(-200, WORLD.FLOOR, WORLD.W + 400, 400), // ground
    box(-200, -2000, 200, 4000), // left edge
    box(WORLD.W, -2000, 200, 4000), // right edge (tray side)
  ];
  for (const w of level.walls || []) shapes.push(seg(w[0], w[1], w[2], w[3], w[4] ?? 12));
  for (const b of level.blocks || []) shapes.push(box(b[0], b[1], b[2], b[3]));
  shapes.push(...bucketShapes(level.bucket));
  for (const p of level.fixed || []) shapes.push(...pieceShapes(p).shapes);
  return shapes;
}

export function levelZones(level) {
  return (level.fixed || []).flatMap((p) => pieceShapes(p).zones);
}

export function createSim(level, pieces) {
  const shapes = levelShapes(level);
  const zones = levelZones(level);
  for (const p of pieces) {
    const s = pieceShapes(p);
    shapes.push(...s.shapes);
    zones.push(...s.zones);
  }
  return {
    level,
    shapes,
    zones,
    portals: zones.filter((z) => z.kind === 'portal'), // paired in order: 0<->1, 2<->3
    portalLock: -1, // portal the ball just came out of; ignored until it leaves
    hold: null, // { zone, t } while a cannon is holding the ball
    cannonCool: 0,
    ball: { x: level.ball.x, y: level.ball.y, vx: 0, vy: 0, rot: 0, hidden: false },
    t: 0,
    inT: 0,
    stillT: 0,
    groundT: 0,
    boings: 0,
    result: null, // 'win' | 'miss'
    events: [], // { type: 'hit'|'boing'|'bump'|'load'|'boom'|'warp', ... } drained by the game for sounds
  };
}

function closest(s, px, py) {
  if (s.kind === 'seg') {
    const dx = s.bx - s.ax;
    const dy = s.by - s.ay;
    const l2 = dx * dx + dy * dy;
    let t = l2 ? ((px - s.ax) * dx + (py - s.ay) * dy) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return { x: s.ax + dx * t, y: s.ay + dy * t };
  }
  const cx = Math.min(Math.max(px, s.x), s.x + s.w);
  const cy = Math.min(Math.max(py, s.y), s.y + s.h);
  if (cx !== px || cy !== py) return { x: cx, y: cy };
  // Centre is inside the box: push out through the nearest face.
  const dl = px - s.x;
  const dr = s.x + s.w - px;
  const dt = py - s.y;
  const db = s.y + s.h - py;
  const m = Math.min(dl, dr, dt, db);
  if (m === dt) return { inside: true, nx: 0, ny: -1, d: dt };
  if (m === db) return { inside: true, nx: 0, ny: 1, d: db };
  if (m === dl) return { inside: true, nx: -1, ny: 0, d: dl };
  return { inside: true, nx: 1, ny: 0, d: dr };
}

function collide(sim, s, h) {
  const b = sim.ball;
  const c = closest(s, b.x, b.y);
  let nx, ny, pen;
  if (c.inside) {
    nx = c.nx;
    ny = c.ny;
    pen = BALL_R + c.d;
  } else {
    const dx = b.x - c.x;
    const dy = b.y - c.y;
    const R = BALL_R + (s.r || 0);
    const d2 = dx * dx + dy * dy;
    if (d2 >= R * R) return;
    const d = Math.sqrt(d2) || 1e-6;
    nx = dx / d;
    ny = dy / d;
    pen = R - d;
  }
  b.x += nx * pen;
  b.y += ny * pen;

  const tx = -ny;
  const ty = nx;
  const vn = b.vx * nx + b.vy * ny;
  let vt = b.vx * tx + b.vy * ty;
  let nvn = vn;
  if (vn < 0) {
    if (s.mat === 'tramp' && ny < -0.5) {
      // Always launch straight up so bounces are predictable for kids.
      b.vy = -Math.max(-vn * 0.6, TRAMP.launch);
      sim.events.push({ type: 'boing', v: -b.vy, x: b.x, y: b.y });
      sim.boings++;
      return;
    } else if (s.mat === 'bumper') {
      nvn = Math.max(-vn * 0.9, BUMPER.kick);
      sim.events.push({ type: 'bump', x: s.ax, y: s.ay });
    } else {
      nvn = -vn * RESTITUTION;
      if (nvn < 60) nvn = 0;
      if (-vn > 250) sim.events.push({ type: 'hit', v: -vn, mat: s.mat });
    }
  }
  if (s.mat === 'belt') {
    vt += (s.speed * tx - vt) * Math.min(1, 14 * h);
  } else {
    vt *= 1 - 0.25 * h; // rolling resistance
  }
  b.vx = nx * nvn + tx * vt;
  b.vy = ny * nvn + ty * vt;
}

function substep(sim, h) {
  const b = sim.ball;
  if (sim.hold) {
    // Inside a cannon: wait, then fire from the muzzle.
    const z = sim.hold.zone;
    sim.hold.t -= h;
    Object.assign(b, { x: z.x, y: z.y, vx: 0, vy: 0 });
    if (sim.hold.t <= 0) {
      Object.assign(b, { x: z.mx, y: z.my, vx: z.vx, vy: z.vy, hidden: false });
      sim.hold = null;
      sim.cannonCool = 0.5;
      sim.events.push({ type: 'boom', x: z.mx, y: z.my });
    }
    return;
  }
  if (sim.cannonCool > 0) sim.cannonCool -= h;
  b.vy += G * h;
  for (const z of sim.zones) {
    if (z.kind === 'wind') {
      if (b.x > z.x0 && b.x < z.x1 && b.y > z.y0 - BALL_R * 0.5 && b.y < z.y1 + BALL_R * 0.5) {
        const k = 1 - Math.min(1, Math.abs(b.x - z.fx) / (FAN.reach + 80));
        b.vx += z.dir * FAN.accel * (0.35 + 0.65 * k) * h;
      }
    } else if (z.kind === 'magnet') {
      const dx = z.x - b.x;
      const dy = z.y - b.y;
      const d = Math.hypot(dx, dy);
      // Pulls sideways only, so the ball still drops (into a bucket in the way)
      // instead of getting pinned to things.
      if (d < z.range && Math.abs(dx) > 1) {
        const a = MAGNET.pull * (1 - d / z.range);
        b.vx += Math.sign(dx) * a * h;
      }
    } else if (z.kind === 'cannon') {
      if (sim.cannonCool <= 0 && Math.hypot(b.x - z.x, b.y - z.y) < z.r) {
        sim.hold = { zone: z, t: CANNON.hold };
        b.hidden = true;
        sim.events.push({ type: 'load', x: z.x, y: z.y });
        return;
      }
    }
  }
  const sp = Math.hypot(b.vx, b.vy);
  if (sp > MAX_SPEED) {
    b.vx *= MAX_SPEED / sp;
    b.vy *= MAX_SPEED / sp;
  }
  b.x += b.vx * h;
  b.y += b.vy * h;
  for (const s of sim.shapes) collide(sim, s, h);
  b.rot += (b.vx / BALL_R) * h;
  if (sim.portals.length >= 2) teleport(sim);
}

function teleport(sim) {
  const b = sim.ball;
  const ps = sim.portals;
  if (sim.portalLock >= 0) {
    const lp = ps[sim.portalLock];
    if (Math.hypot(b.x - lp.x, b.y - lp.y) > PORTAL.r + BALL_R) sim.portalLock = -1;
  }
  for (let i = 0; i < ps.length; i++) {
    if (i === sim.portalLock) continue;
    const p = ps[i];
    const o = ps[i ^ 1];
    if (!o || Math.hypot(b.x - p.x, b.y - p.y) >= p.r) continue;
    b.x = o.x;
    b.y = o.y;
    sim.portalLock = i ^ 1;
    sim.events.push({ type: 'warp', x: p.x, y: p.y, tx: o.x, ty: o.y });
    return;
  }
}

export function inBucket(bucket, x, y) {
  const hw = BUCKET.w / 2 - 14;
  return x > bucket.x - hw && x < bucket.x + hw && y > bucket.y - BUCKET.h + 20 && y < bucket.y;
}

export function stepSim(sim, dt) {
  if (sim.result) return;
  const h = dt / SUBSTEPS;
  for (let i = 0; i < SUBSTEPS; i++) substep(sim, h);
  sim.t += dt;
  const b = sim.ball;
  if (inBucket(sim.level.bucket, b.x, b.y)) sim.inT += dt;
  else sim.inT = 0;
  if (sim.inT > 0.3) {
    sim.result = 'win';
    return;
  }
  if (Math.hypot(b.vx, b.vy) < 25 && !sim.hold) sim.stillT += dt;
  else sim.stillT = 0;
  // No bucket sits on bare ground in reach of a rolling ball, so a ball
  // rolling along the ground has missed; don't make kids wait for it to stop.
  if (b.y > WORLD.FLOOR - BALL_R - 3) sim.groundT += dt;
  else sim.groundT = 0;
  if (sim.stillT > 1 || sim.groundT > 1.2 || sim.boings > MAX_BOINGS || sim.t > MAX_TIME || b.y > WORLD.H + 200) sim.result = 'miss';
}

// Run a whole attempt headlessly. Used by tests and level tuning.
export function runToEnd(level, pieces, dt = 1 / 60) {
  const sim = createSim(level, pieces);
  while (!sim.result) stepSim(sim, dt);
  return sim;
}
