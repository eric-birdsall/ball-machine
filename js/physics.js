// A tiny purpose-built physics sim: one ball against static shapes.
// Pure module (no DOM) so the level tests can run it in Node.
import { pieceShapes, TRAMP, FAN, BUMPER, MAGNET, CANNON, PORTAL, JELLY, GLOVE, BLOWER, CLOUD } from './pieces.js';

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
  pieces.forEach((p, pi) => {
    const s = pieceShapes(p);
    // Tag each part with its piece so we can tell which pieces the ball used.
    for (const part of [...s.shapes, ...s.zones]) part.pi = pi;
    shapes.push(...s.shapes);
    zones.push(...s.zones);
  });
  return {
    level,
    shapes,
    zones,
    portals: zones.filter((z) => z.kind === 'portal'), // paired in order: 0<->1, 2<->3
    portalLock: -1, // portal the ball just came out of; ignored until it leaves
    hold: null, // { zone, t } while a cannon or pipe is holding the ball
    cannonCool: 0,
    carry: null, // { zone, t } while a balloon is carrying the ball
    clock: 0, // sim time advanced per substep (drives spinners)
    firstTouch: [], // per placed piece: time the ball first/last used it
    lastTouch: [],
    trail: [], // recent positions, to notice a ball that is going nowhere
    ball: { x: level.ball.x, y: level.ball.y, vx: 0, vy: 0, rot: 0, hidden: false },
    t: 0,
    inT: 0,
    stillT: 0,
    groundT: 0,
    boings: 0,
    result: null, // 'win' | 'miss'
    events: [], // { type: 'hit'|'boing'|'bump'|'load'|'boom'|'warp'|..., ... } drained by the game for sounds
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

// Is the ball touching this (static) shape?
function overlaps(s, b) {
  if (s.kind === 'spin') return Math.hypot(b.x - s.cx, b.y - s.cy) < s.R + BALL_R;
  const c = closest(s, b.x, b.y);
  if (c.inside) return true;
  return Math.hypot(b.x - c.x, b.y - c.y) < BALL_R + (s.r || 0);
}

function touch(sim, part) {
  if (part.pi === undefined) return;
  if (sim.firstTouch[part.pi] === undefined) sim.firstTouch[part.pi] = sim.clock;
  sim.lastTouch[part.pi] = sim.clock;
}

// A pinwheel: two bars turning about a centre. Collide against each bar as a
// moving surface, so the ball is batted along.
function collideSpinner(sim, s) {
  const b = sim.ball;
  for (let k = 0; k < 2; k++) {
    const a = s.w * sim.clock + (k * Math.PI) / 2;
    const dx = Math.cos(a) * s.R;
    const dy = Math.sin(a) * s.R;
    const c = closest({ kind: 'seg', ax: s.cx - dx, ay: s.cy - dy, bx: s.cx + dx, by: s.cy + dy }, b.x, b.y);
    const ox = b.x - c.x;
    const oy = b.y - c.y;
    const R = BALL_R + s.r;
    const d2 = ox * ox + oy * oy;
    if (d2 >= R * R) continue;
    const d = Math.sqrt(d2) || 1e-6;
    const nx = ox / d;
    const ny = oy / d;
    b.x += nx * (R - d);
    b.y += ny * (R - d);
    // velocity of the bar at the contact point
    const sx = -s.w * (c.y - s.cy);
    const sy = s.w * (c.x - s.cx);
    const rvx = b.vx - sx;
    const rvy = b.vy - sy;
    const vn = rvx * nx + rvy * ny;
    touch(sim, s);
    if (vn >= 0) continue;
    const tx = -ny;
    const ty = nx;
    const vt = rvx * tx + rvy * ty;
    const nvn = -vn * 0.35;
    b.vx = nx * nvn + tx * vt + sx;
    b.vy = ny * nvn + ty * vt + sy;
    if (-vn > 250) sim.events.push({ type: 'hit', v: -vn, mat: 'spin' });
  }
}

function collide(sim, s, h) {
  if (s.kind === 'spin') return collideSpinner(sim, s);
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
  touch(sim, s);

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
    } else if (s.mat === 'jelly') {
      nvn = Math.max(-vn * 0.85, JELLY.bounce);
      sim.events.push({ type: 'wobble', x: s.x + s.w / 2, y: s.y + s.h / 2 });
    } else {
      nvn = -vn * RESTITUTION;
      if (nvn < 60) nvn = 0;
      if (-vn > 250) sim.events.push({ type: 'hit', v: -vn, mat: s.mat });
    }
  }
  if (s.mat === 'belt') {
    // Drag the ball along the belt's own direction (flat conveyors and sloped escalators).
    const len = Math.hypot(s.bx - s.ax, s.by - s.ay) || 1;
    const along = ((s.bx - s.ax) * tx + (s.by - s.ay) * ty) / len;
    vt += (s.speed * along - vt) * Math.min(1, 14 * h);
  } else {
    vt *= 1 - 0.25 * h; // rolling resistance
  }
  b.vx = nx * nvn + tx * vt;
  b.vy = ny * nvn + ty * vt;
}

function substep(sim, h) {
  const b = sim.ball;
  sim.clock += h;
  if (sim.hold) {
    // Inside a cannon or pipe: wait, then come out of the muzzle.
    const z = sim.hold.zone;
    sim.hold.t -= h;
    Object.assign(b, { x: z.x, y: z.y, vx: 0, vy: 0 });
    if (sim.hold.t <= 0) {
      Object.assign(b, { x: z.mx, y: z.my, vx: z.vx, vy: z.vy, hidden: false });
      sim.hold = null;
      sim.cannonCool = 0.5;
      sim.events.push({ type: z.sub === 'pipe' ? 'pipeOut' : 'boom', x: z.mx, y: z.my });
    }
    return;
  }
  if (sim.carry) {
    // Hanging from a balloon: drift up, then it pops and lets go.
    const z = sim.carry.zone;
    sim.carry.t -= h;
    b.x += z.vx * h;
    b.y += z.vy * h;
    b.vx = z.vx;
    b.vy = 0;
    // It also pops if it bumps into something (after a moment to lift clear of
    // whatever the ball was resting on).
    const bumped = z.time - sim.carry.t > 0.3 && sim.shapes.some((sh) => overlaps(sh, b));
    if (bumped || sim.carry.t <= 0 || b.y < 60 || b.x < BALL_R + 4 || b.x > WORLD.W - BALL_R - 4) {
      sim.carry = null;
      sim.events.push({ type: 'pop', x: b.x, y: b.y - 70, pi: z.pi });
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
        touch(sim, z);
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
        if (a > 400) touch(sim, z);
      }
    } else if (z.kind === 'cannon') {
      if (sim.cannonCool <= 0 && Math.hypot(b.x - z.x, b.y - z.y) < z.r) {
        sim.hold = { zone: z, t: z.hold ?? CANNON.hold };
        b.hidden = true;
        touch(sim, z);
        sim.events.push({ type: 'load', x: z.x, y: z.y });
        return;
      }
    } else if (z.kind === 'punch') {
      if (!(z.cool > sim.clock) && b.x > z.x0 - BALL_R && b.x < z.x1 + BALL_R && b.y > z.y0 && b.y < z.y1) {
        b.vx = z.dir * GLOVE.vx;
        b.vy = GLOVE.vy;
        z.cool = sim.clock + 0.4;
        touch(sim, z);
        sim.events.push({ type: 'punch', x: z.x, y: z.y, pi: z.pi });
      }
    } else if (z.kind === 'updraft') {
      if (b.x > z.x0 && b.x < z.x1 && b.y > z.y0 && b.y < z.y1 + BALL_R) {
        const k = Math.min(1, Math.max(0, (z.y1 - b.y) / BLOWER.reach));
        b.vy -= BLOWER.accel * (1 - 0.6 * k) * h;
        touch(sim, z);
      }
    } else if (z.kind === 'cloud') {
      const ex = (b.x - z.x) / z.rx;
      const ey = (b.y - z.y) / z.ry;
      if (ex * ex + ey * ey < 1) {
        // Soft and floaty: the ball loses its speed and sinks slowly.
        const k = Math.max(0, 1 - CLOUD.drag * h);
        b.vx *= k;
        b.vy *= k;
        touch(sim, z);
      }
    } else if (z.kind === 'carry') {
      if (!z.used && Math.hypot(b.x - z.x, b.y - z.y) < z.r) {
        z.used = true; // one ride per balloon
        sim.carry = { zone: z, t: z.time };
        touch(sim, z);
        sim.events.push({ type: 'grab', x: z.x, y: z.y, pi: z.pi });
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
    touch(sim, p);
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
  // Going nowhere: if the ball has stayed inside a small area for 4 seconds
  // (hovering, rattling in a corner), call it a miss rather than make kids wait.
  if (Math.floor(sim.t * 2) !== Math.floor((sim.t - dt) * 2)) {
    sim.trail.push(b.x, b.y);
    if (sim.trail.length > 16) sim.trail.splice(0, 2);
    if (sim.trail.length === 16) {
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (let i = 0; i < 16; i += 2) {
        x0 = Math.min(x0, sim.trail[i]);
        x1 = Math.max(x1, sim.trail[i]);
        y0 = Math.min(y0, sim.trail[i + 1]);
        y1 = Math.max(y1, sim.trail[i + 1]);
      }
      if (x1 - x0 < 150 && y1 - y0 < 150) sim.result = 'miss';
    }
  }
  if (sim.result) return;
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
