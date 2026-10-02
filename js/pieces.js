// Placeable machine pieces. Pure data + geometry (no DOM) so tests can use it.
// Every piece instance is { type, x, y, dir } where dir is 1 or -1.
//   ramp:     dir 1 slopes down to the right
//   fan:      dir 1 blows to the right
//   conveyor: dir 1 carries to the right
//   cannon:   dir 1 fires up and to the right
//   slide:    dir 1 curves a falling ball out to the right
//   glove:    dir 1 punches to the right
//   pipe:     dir 1 lets the ball out to the right
//   escalator: dir 1 carries the ball up and to the right
//   balloon:  dir 1 drifts up and to the right
//   spinner:  dir 1 spins clockwise
//   tramp, bumper, magnet, funnel, portal, plank, block, jelly, blower, cloud: dir is ignored

export const RAMP = { len: 280, r: 9, tilt: 0.38 };
export const TRAMP = { w: 170, h: 70, launch: 1300 };
export const FAN = { size: 100, reach: 560, band: 180, accel: 2600 };
export const CONV = { len: 320, r: 18, speed: 520 };
export const BUMPER = { r: 46, kick: 950 };
export const MAGNET = { size: 90, range: 480, pull: 3200 };
export const CANNON = { catchR: 72, barrel: 95, speed: 1200, angle: 0.9, hold: 0.45 };
export const FUNNEL = { top: 118, bottom: 46, h: 110, r: 8 };
export const SLIDE = { R: 230, r: 10, segs: 9 };
export const PORTAL = { r: 58, catchR: 42 };
export const PLANK = { len: 260, r: 9 };
export const BLOCK = { size: 90 };
export const JELLY = { size: 100, bounce: 620 };
export const GLOVE = { size: 90, reach: 56, vx: 1000, vy: -320 };
export const PIPE = { size: 100, catchR: 52, speed: 760, hold: 0.3 };
export const ESC = { len: 300, r: 18, tilt: 0.5, speed: 430 };
export const BLOWER = { size: 100, reach: 520, band: 170, accel: 2900 };
export const CLOUD = { rx: 120, ry: 75, drag: 7 };
export const BALLOON = { r: 52, catchR: 62, time: 1.25, vx: 170, vy: -300 };
export const SPINNER = { R: 115, r: 9, speed: 2.6 };

export const PIECE_TYPES = [
  'ramp', 'tramp', 'fan', 'conveyor', 'bumper', 'magnet', 'cannon', 'funnel', 'slide', 'portal',
  'plank', 'block', 'jelly', 'glove', 'pipe', 'escalator', 'blower', 'cloud', 'balloon', 'spinner',
];

const FLIPPABLE = new Set(['ramp', 'fan', 'conveyor', 'cannon', 'slide', 'glove', 'pipe', 'escalator', 'balloon', 'spinner']);

// Whether a piece reacts to a tap (flip).
export function canFlip(type) {
  return FLIPPABLE.has(type);
}

export function rampEnds(p) {
  const a = RAMP.tilt * p.dir;
  const hx = (Math.cos(a) * RAMP.len) / 2;
  const hy = (Math.sin(a) * RAMP.len) / 2;
  return [p.x - hx, p.y - hy, p.x + hx, p.y + hy];
}

// Points along the slide's quarter-circle, from the top lip to the exit.
export function slidePoints(p) {
  const R = SLIDE.R;
  const cx = p.x + (p.dir * R) / 2;
  const cy = p.y - R / 2;
  const pts = [];
  for (let i = 0; i <= SLIDE.segs; i++) {
    const k = i / SLIDE.segs;
    // dir 1: angle 180° -> 90° (left wall down to bottom); dir -1 mirrors it.
    const a = p.dir > 0 ? Math.PI - (k * Math.PI) / 2 : (k * Math.PI) / 2;
    pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]);
  }
  return pts;
}

export function funnelSegs(p) {
  const { top, bottom, h } = FUNNEL;
  return [
    [p.x - top, p.y - h / 2, p.x - bottom, p.y + h / 2],
    [p.x + top, p.y - h / 2, p.x + bottom, p.y + h / 2],
  ];
}

// Low and high ends of an escalator belt.
export function escalatorEnds(p) {
  const hx = (Math.cos(ESC.tilt) * ESC.len) / 2;
  const hy = (Math.sin(ESC.tilt) * ESC.len) / 2;
  return [p.x - p.dir * hx, p.y + hy, p.x + p.dir * hx, p.y - hy];
}

// Where a cannon catches the ball, and the muzzle/velocity it fires with.
export function cannonGeom(p) {
  const cx = p.x;
  const cy = p.y - 15;
  const ux = p.dir * Math.cos(CANNON.angle);
  const uy = -Math.sin(CANNON.angle);
  return {
    cx,
    cy,
    mx: cx + ux * CANNON.barrel,
    my: cy + uy * CANNON.barrel,
    vx: ux * CANNON.speed,
    vy: uy * CANNON.speed,
  };
}

const seg = (ax, ay, bx, by, r, mat = 'wood', extra = {}) => ({ kind: 'seg', ax, ay, bx, by, r, mat, ...extra });
const box = (x, y, w, h, mat = 'solid') => ({ kind: 'box', x, y, w, h, mat });

// Collision shapes and force/trigger zones for a piece.
export function pieceShapes(p) {
  switch (p.type) {
    case 'ramp': {
      const [ax, ay, bx, by] = rampEnds(p);
      return { shapes: [seg(ax, ay, bx, by, RAMP.r)], zones: [] };
    }
    case 'tramp': {
      const { w, h } = TRAMP;
      const top = p.y - h / 2 + 10;
      return {
        shapes: [seg(p.x - w / 2 + 12, top, p.x + w / 2 - 12, top, 10, 'tramp'), box(p.x - w / 2, p.y + h / 2 - 18, w, 18)],
        zones: [],
      };
    }
    case 'fan': {
      const s = FAN.size / 2;
      const x0 = p.dir > 0 ? p.x + s : p.x - s - FAN.reach;
      return {
        shapes: [box(p.x - s, p.y - s, FAN.size, FAN.size)],
        zones: [{ kind: 'wind', x0, x1: x0 + FAN.reach, y0: p.y - FAN.band / 2, y1: p.y + FAN.band / 2, dir: p.dir, fx: p.x }],
      };
    }
    case 'conveyor': {
      const hl = CONV.len / 2;
      return { shapes: [seg(p.x - hl, p.y, p.x + hl, p.y, CONV.r, 'belt', { speed: p.dir * CONV.speed })], zones: [] };
    }
    case 'bumper':
      return { shapes: [seg(p.x, p.y, p.x, p.y, BUMPER.r, 'bumper')], zones: [] };
    case 'magnet': {
      const s = MAGNET.size / 2;
      return {
        shapes: [box(p.x - s, p.y - s, MAGNET.size, MAGNET.size)],
        zones: [{ kind: 'magnet', x: p.x, y: p.y, range: MAGNET.range }],
      };
    }
    case 'cannon': {
      const g = cannonGeom(p);
      return {
        shapes: [box(p.x - 50, p.y + 28, 100, 32)],
        zones: [{ kind: 'cannon', x: g.cx, y: g.cy, r: CANNON.catchR, mx: g.mx, my: g.my, vx: g.vx, vy: g.vy }],
      };
    }
    case 'funnel':
      return { shapes: funnelSegs(p).map((s) => seg(...s, FUNNEL.r, 'funnel')), zones: [] };
    case 'slide': {
      const pts = slidePoints(p);
      const shapes = [];
      for (let i = 0; i < pts.length - 1; i++) shapes.push(seg(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], SLIDE.r, 'slide'));
      return { shapes, zones: [] };
    }
    case 'portal':
      return { shapes: [], zones: [{ kind: 'portal', x: p.x, y: p.y, r: PORTAL.catchR }] };
    case 'plank':
      return { shapes: [seg(p.x - PLANK.len / 2, p.y, p.x + PLANK.len / 2, p.y, PLANK.r)], zones: [] };
    case 'block': {
      const s = BLOCK.size / 2;
      return { shapes: [box(p.x - s, p.y - s, BLOCK.size, BLOCK.size)], zones: [] };
    }
    case 'jelly': {
      const s = JELLY.size / 2;
      return { shapes: [box(p.x - s, p.y - s, JELLY.size, JELLY.size, 'jelly')], zones: [] };
    }
    case 'glove': {
      const s = GLOVE.size / 2;
      const face = p.x + p.dir * s;
      return {
        shapes: [box(p.x - s, p.y - s, GLOVE.size, GLOVE.size)],
        zones: [{ kind: 'punch', x0: Math.min(face, face + p.dir * GLOVE.reach), x1: Math.max(face, face + p.dir * GLOVE.reach), y0: p.y - 55, y1: p.y + 55, dir: p.dir, x: face, y: p.y }],
      };
    }
    case 'pipe': {
      const s = PIPE.size / 2;
      // Reuses the cannon mechanism: catch at the top mouth, pop out of the side mouth.
      return {
        shapes: [box(p.x - s, p.y - s, PIPE.size, PIPE.size)],
        zones: [{ kind: 'cannon', sub: 'pipe', x: p.x, y: p.y - s - 5, r: PIPE.catchR, mx: p.x + p.dir * (s + 45), my: p.y + 12, vx: p.dir * PIPE.speed, vy: 0, hold: PIPE.hold }],
      };
    }
    case 'escalator': {
      const [ax, ay, bx, by] = escalatorEnds(p);
      return { shapes: [seg(ax, ay, bx, by, ESC.r, 'belt', { speed: ESC.speed })], zones: [] };
    }
    case 'blower': {
      const s = BLOWER.size / 2;
      return {
        shapes: [box(p.x - s, p.y - s, BLOWER.size, BLOWER.size)],
        zones: [{ kind: 'updraft', x0: p.x - BLOWER.band / 2, x1: p.x + BLOWER.band / 2, y0: p.y - s - BLOWER.reach, y1: p.y - s }],
      };
    }
    case 'cloud':
      return { shapes: [], zones: [{ kind: 'cloud', x: p.x, y: p.y, rx: CLOUD.rx, ry: CLOUD.ry }] };
    case 'balloon':
      return { shapes: [], zones: [{ kind: 'carry', x: p.x, y: p.y, r: BALLOON.catchR, vx: p.dir * BALLOON.vx, vy: BALLOON.vy, time: BALLOON.time }] };
    case 'spinner':
      return { shapes: [{ kind: 'spin', cx: p.x, cy: p.y, R: SPINNER.R, r: SPINNER.r, w: p.dir * SPINNER.speed, mat: 'spin' }], zones: [] };
  }
  return { shapes: [], zones: [] };
}

const square = (p, s) => ({ x0: p.x - s, y0: p.y - s, x1: p.x + s, y1: p.y + s });

// Axis-aligned bounds of the visible body of a piece (for hit tests / clamping / overlap checks).
export function pieceBounds(p) {
  switch (p.type) {
    case 'ramp': {
      const [ax, ay, bx, by] = rampEnds(p);
      const r = RAMP.r;
      return { x0: Math.min(ax, bx) - r, y0: Math.min(ay, by) - r, x1: Math.max(ax, bx) + r, y1: Math.max(ay, by) + r };
    }
    case 'tramp':
      return { x0: p.x - TRAMP.w / 2, y0: p.y - TRAMP.h / 2, x1: p.x + TRAMP.w / 2, y1: p.y + TRAMP.h / 2 };
    case 'fan':
      return { x0: p.x - FAN.size / 2, y0: p.y - FAN.size / 2, x1: p.x + FAN.size / 2, y1: p.y + FAN.size / 2 };
    case 'conveyor':
      return { x0: p.x - CONV.len / 2 - CONV.r, y0: p.y - CONV.r, x1: p.x + CONV.len / 2 + CONV.r, y1: p.y + CONV.r };
    case 'bumper':
      return { x0: p.x - BUMPER.r, y0: p.y - BUMPER.r, x1: p.x + BUMPER.r, y1: p.y + BUMPER.r };
    case 'magnet':
      return { x0: p.x - MAGNET.size / 2, y0: p.y - MAGNET.size / 2, x1: p.x + MAGNET.size / 2, y1: p.y + MAGNET.size / 2 };
    case 'cannon':
      return { x0: p.x - 70, y0: p.y - 75, x1: p.x + 70, y1: p.y + 60 };
    case 'funnel': {
      const r = FUNNEL.r;
      return { x0: p.x - FUNNEL.top - r, y0: p.y - FUNNEL.h / 2 - r, x1: p.x + FUNNEL.top + r, y1: p.y + FUNNEL.h / 2 + r };
    }
    case 'slide':
      return { x0: p.x - SLIDE.R / 2 - SLIDE.r, y0: p.y - SLIDE.R / 2 - SLIDE.r, x1: p.x + SLIDE.R / 2 + SLIDE.r, y1: p.y + SLIDE.R / 2 + SLIDE.r };
    case 'portal':
      return { x0: p.x - PORTAL.r, y0: p.y - PORTAL.r * 1.2, x1: p.x + PORTAL.r, y1: p.y + PORTAL.r * 1.2 };
    case 'plank':
      return { x0: p.x - PLANK.len / 2 - PLANK.r, y0: p.y - PLANK.r, x1: p.x + PLANK.len / 2 + PLANK.r, y1: p.y + PLANK.r };
    case 'block':
      return square(p, BLOCK.size / 2);
    case 'jelly':
      return square(p, JELLY.size / 2);
    case 'glove':
      return { x0: p.x - GLOVE.size / 2 - (p.dir < 0 ? 30 : 0), y0: p.y - GLOVE.size / 2, x1: p.x + GLOVE.size / 2 + (p.dir > 0 ? 30 : 0), y1: p.y + GLOVE.size / 2 };
    case 'pipe':
      return { x0: p.x - PIPE.size / 2 - (p.dir < 0 ? 20 : 0), y0: p.y - PIPE.size / 2 - 12, x1: p.x + PIPE.size / 2 + (p.dir > 0 ? 20 : 0), y1: p.y + PIPE.size / 2 };
    case 'escalator': {
      const [ax, ay, bx, by] = escalatorEnds(p);
      const r = ESC.r;
      return { x0: Math.min(ax, bx) - r, y0: Math.min(ay, by) - r, x1: Math.max(ax, bx) + r, y1: Math.max(ay, by) + r };
    }
    case 'blower':
      return square(p, BLOWER.size / 2);
    case 'cloud':
      return { x0: p.x - CLOUD.rx, y0: p.y - CLOUD.ry, x1: p.x + CLOUD.rx, y1: p.y + CLOUD.ry };
    case 'balloon':
      return { x0: p.x - BALLOON.r, y0: p.y - BALLOON.r * 1.2, x1: p.x + BALLOON.r, y1: p.y + BALLOON.r * 1.2 + 40 };
    case 'spinner':
      return square(p, SPINNER.R + SPINNER.r);
  }
  return { x0: p.x, y0: p.y, x1: p.x, y1: p.y };
}
