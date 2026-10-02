// Canvas drawing: everything is drawn with shapes, no image files.
import {
  RAMP, TRAMP, FAN, CONV, BUMPER, MAGNET, CANNON, SLIDE, PORTAL,
  PLANK, BLOCK, JELLY, GLOVE, PIPE, ESC, BLOWER, CLOUD, BALLOON, SPINNER,
  rampEnds, pieceBounds, slidePoints, funnelSegs, cannonGeom, escalatorEnds,
} from './pieces.js';
import { WORLD, BALL_R, BUCKET } from './physics.js';

export const VIEW = { W: 1920, H: 1080 };

// Screen layout in logical (1920 x 1080) coordinates.
export const UI = {
  trayX: WORLD.W,
  home: { x: 1680, y: 80, r: 52 },
  music: { x: 1840, y: 80, r: 52 },
  // Tray slots shrink to fit when a level offers more kinds of piece.
  slot: (i, n = 3) => {
    const h = Math.min(205, (675 - (n - 1) * 14) / n);
    return { x: 1625, y: 165 + i * (h + 14), w: 270, h };
  },
  go: { x: 1760, y: 955, r: 100 },
  replay: { x: 740, y: 660, r: 95 },
  next: { x: 1060, y: 660, r: 115 },
  // Level picker: one world per page, 10 levels in two rows of five.
  levelBtn: (i) => ({ x: 275 + (i % 5) * 280, y: 300 + Math.floor(i / 5) * 285, w: 250, h: 250 }),
  pagePrev: { x: 135, y: 568, r: 58 },
  pageNext: { x: 1785, y: 568, r: 58 },
  levelsPerPage: 10,
};

const C = {
  ink: '#2d2a4a',
  skyTop: '#6ec3f4',
  skyBottom: '#d9f2ff',
  grass: '#5cc84a',
  grassDark: '#3fa632',
  dirt: '#b07844',
  brick: '#ef8a4c',
  brickLine: '#c4632c',
  beam: '#b97c47',
  beamDark: '#8a5528',
  ramp: '#ffc93c',
  rampDark: '#e09a00',
  trampPad: '#ff5e7e',
  trampBase: '#5b6285',
  spring: '#a9b3c9',
  fan: '#48b0ff',
  fanDark: '#1f7fd1',
  belt: '#4a4f66',
  wheel: '#ffd23c',
  ball: '#ff4d4d',
  ballDark: '#d42f3a',
  bucket: '#3b8fe0',
  bucketDark: '#276bb5',
  pipe: '#35c46f',
  pipeDark: '#1f9651',
  tray: '#ffe7b8',
  trayDark: '#e7b565',
  go: '#34c759',
  goDark: '#1f9a3f',
  stop: '#ff9f1c',
  stopDark: '#d97a00',
  bumper: '#ff5ea8',
  magnet: '#ff4d4d',
  steel: '#c9d1e0',
  cannon: '#4a4f66',
  funnel: '#2ec4b6',
  funnelDark: '#1b8f85',
  slide: '#9b5de5',
  slideLight: '#c9a7ff',
  portals: ['#8a4dff', '#ff9f1c'],
  plank: '#8fd16a',
  plankDark: '#5fa53c',
  jelly: '#7be0c3',
  jellyDark: '#3fb596',
  glove: '#ff5a4d',
  pipeBody: '#35c46f',
  esc: '#6c7bd9',
  blower: '#ffa94d',
  balloon: '#ff6fae',
  spinner: ['#ff5e7e', '#ffd23c', '#48b0ff', '#34c759'],
};

// One sky theme per world (10 levels each).
export const THEMES = [
  { top: '#6ec3f4', bottom: '#d9f2ff', hills: '#a6dd8f', sun: '#ffd84a' }, // sunny day
  { top: '#7fd6c8', bottom: '#f4ffe0', hills: '#9fd67a', sun: '#ffe066' }, // meadow
  { top: '#ff9a8b', bottom: '#ffe29f', hills: '#e8b27a', sun: '#ffb347' }, // sunset
  { top: '#1c2a5a', bottom: '#4a5aa0', hills: '#34506a', moon: true }, // night
  { top: '#b89cff', bottom: '#ffd6f0', hills: '#f2a6cf', sun: '#fff0a0' }, // candy
  { top: '#9fd8ff', bottom: '#f4fbff', hills: '#dfeaf5', sun: '#fff3b0' }, // snow
  { top: '#ffc76b', bottom: '#ffeec2', hills: '#e0a55c', sun: '#ff8a3c' }, // desert
  { top: '#2bb3c0', bottom: '#c9f5ee', hills: '#5fc7a8', sun: '#fff59e' }, // lagoon
  { top: '#e8794a', bottom: '#ffd9a8', hills: '#c76a3a', sun: '#ffe08a' }, // autumn
  { top: '#2a1a5e', bottom: '#8a4fbf', hills: '#4a2f7a', moon: true }, // space
];

const FONT = "'SF Pro Rounded', ui-rounded, 'Arial Rounded MT Bold', 'Nunito', system-ui, sans-serif";

function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fillStroke(ctx, fill, stroke = C.ink, lw = 6) {
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

// ---------------------------------------------------------------- background

export function drawBackground(ctx, t, ext, theme = THEMES[0]) {
  // ext = visible logical rect (may extend beyond 1920x1080 on odd aspect ratios)
  const g = ctx.createLinearGradient(0, ext.y0, 0, WORLD.FLOOR);
  g.addColorStop(0, theme.top);
  g.addColorStop(1, theme.bottom);
  ctx.fillStyle = g;
  ctx.fillRect(ext.x0, ext.y0, ext.x1 - ext.x0, ext.y1 - ext.y0);

  if (theme.moon) {
    // twinkling stars + crescent moon
    for (let i = 0; i < 40; i++) {
      const x = ext.x0 + ((i * 373) % (ext.x1 - ext.x0));
      const y = ext.y0 + ((i * 211) % 700);
      ctx.globalAlpha = 0.4 + 0.4 * Math.sin(t * 2 + i);
      drawTwinkle(ctx, x, y, 3 + (i % 3) * 2);
    }
    ctx.globalAlpha = 1;
    circle(ctx, 150, 120, 60);
    ctx.fillStyle = '#fff6c8';
    ctx.fill();
    circle(ctx, 178, 102, 52);
    ctx.fillStyle = theme.top;
    ctx.fill();
  } else {
    ctx.save();
    ctx.translate(150, 120);
    ctx.rotate(t * 0.2);
    ctx.fillStyle = theme.sun;
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 12; i++) {
      ctx.rotate(Math.PI / 6);
      ctx.beginPath();
      ctx.moveTo(-14, 70);
      ctx.lineTo(0, 110);
      ctx.lineTo(14, 70);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    circle(ctx, 0, 0, 62);
    ctx.fill();
    ctx.restore();
  }

  // clouds
  for (let i = 0; i < 4; i++) {
    const span = ext.x1 - ext.x0 + 600;
    const x = ext.x0 - 300 + ((i * 520 + t * (12 + i * 5)) % span);
    const y = 110 + ((i * 97) % 220);
    cloud(ctx, x, y, 0.8 + (i % 3) * 0.25);
  }

  // distant hills
  ctx.fillStyle = theme.hills;
  ctx.beginPath();
  ctx.moveTo(ext.x0, WORLD.FLOOR);
  for (let x = ext.x0; x <= ext.x1 + 40; x += 40) {
    ctx.lineTo(x, WORLD.FLOOR - 90 - Math.sin(x / 260) * 50 - Math.sin(x / 97) * 12);
  }
  ctx.lineTo(ext.x1, WORLD.FLOOR);
  ctx.fill();

  // ground
  ctx.fillStyle = C.dirt;
  ctx.fillRect(ext.x0, WORLD.FLOOR + 14, ext.x1 - ext.x0, ext.y1 - WORLD.FLOOR);
  ctx.fillStyle = C.grass;
  ctx.fillRect(ext.x0, WORLD.FLOOR - 4, ext.x1 - ext.x0, 22);
  ctx.fillStyle = C.grassDark;
  for (let x = Math.floor(ext.x0 / 30) * 30; x < ext.x1; x += 30) {
    ctx.beginPath();
    ctx.moveTo(x, WORLD.FLOOR - 4);
    ctx.lineTo(x + 8, WORLD.FLOOR - 16);
    ctx.lineTo(x + 16, WORLD.FLOOR - 4);
    ctx.fill();
  }
}

function drawTwinkle(ctx, x, y, r) {
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(x, y - r * 2);
  ctx.quadraticCurveTo(x, y, x + r * 2, y);
  ctx.quadraticCurveTo(x, y, x, y + r * 2);
  ctx.quadraticCurveTo(x, y, x - r * 2, y);
  ctx.quadraticCurveTo(x, y, x, y - r * 2);
  ctx.fill();
}

function cloud(ctx, x, y, s) {
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(x, y, 40 * s, 0, Math.PI * 2);
  ctx.arc(x + 45 * s, y - 18 * s, 50 * s, 0, Math.PI * 2);
  ctx.arc(x + 95 * s, y, 38 * s, 0, Math.PI * 2);
  ctx.arc(x + 45 * s, y + 12 * s, 40 * s, 0, Math.PI * 2);
  ctx.fill();
}

// ---------------------------------------------------------------- level art

function drawBlock(ctx, x, y, w, h) {
  rr(ctx, x, y, w, h, 12);
  ctx.save();
  ctx.fillStyle = C.brick;
  ctx.fill();
  ctx.clip();
  ctx.strokeStyle = C.brickLine;
  ctx.lineWidth = 4;
  const bh = 40;
  for (let row = 0, yy = y; yy < y + h; yy += bh, row++) {
    ctx.beginPath();
    ctx.moveTo(x, yy);
    ctx.lineTo(x + w, yy);
    ctx.stroke();
    for (let xx = x + (row % 2 ? 35 : 0); xx < x + w; xx += 70) {
      ctx.beginPath();
      ctx.moveTo(xx, yy);
      ctx.lineTo(xx, yy + bh);
      ctx.stroke();
    }
  }
  ctx.restore();
  rr(ctx, x, y, w, h, 12);
  ctx.lineWidth = 6;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
}

function drawPlank(ctx, ax, ay, bx, by, r, fill, dark) {
  const len = Math.hypot(bx - ax, by - ay);
  ctx.save();
  ctx.translate(ax, ay);
  ctx.rotate(Math.atan2(by - ay, bx - ax));
  rr(ctx, -r, -r, len + 2 * r, 2 * r, r);
  fillStroke(ctx, fill, C.ink, 5);
  ctx.strokeStyle = dark;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(r * 0.5, -r * 0.2);
  ctx.lineTo(len * 0.45, -r * 0.2);
  ctx.moveTo(len * 0.55, r * 0.25);
  ctx.lineTo(len - r * 0.5, r * 0.25);
  ctx.stroke();
  ctx.fillStyle = dark;
  circle(ctx, 0, 0, 4);
  ctx.fill();
  circle(ctx, len, 0, 4);
  ctx.fill();
  ctx.restore();
}

export function drawPipe(ctx, x, y) {
  // Pipe hangs down from the top; its mouth is just above the ball start.
  const mouth = y - BALL_R - 6;
  rr(ctx, x - 48, -40, 96, mouth + 40 - 18, 8);
  fillStroke(ctx, C.pipe);
  rr(ctx, x - 60, mouth - 36, 120, 42, 10);
  fillStroke(ctx, C.pipe);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(x - 36, -20, 14, mouth - 40);
}

export function drawBucket(ctx, b, mood, t) {
  const hw = BUCKET.w / 2;
  const top = b.y - BUCKET.h;
  // handle
  ctx.lineWidth = 8;
  ctx.strokeStyle = C.ink;
  ctx.beginPath();
  ctx.ellipse(b.x, top + 6, hw - 6, 60, 0, Math.PI, 0);
  ctx.stroke();
  ctx.strokeStyle = '#b8c4d8';
  ctx.lineWidth = 4;
  ctx.stroke();
  // body
  const bounce = mood === 'win' ? Math.abs(Math.sin(t * 8)) * 10 : 0;
  ctx.save();
  ctx.translate(0, -bounce);
  ctx.beginPath();
  ctx.moveTo(b.x - hw - 6, top);
  ctx.lineTo(b.x + hw + 6, top);
  ctx.lineTo(b.x + hw - 14, b.y);
  ctx.lineTo(b.x - hw + 14, b.y);
  ctx.closePath();
  fillStroke(ctx, C.bucket);
  ctx.fillStyle = C.bucketDark;
  ctx.fillRect(b.x - hw + 2, top + 30, BUCKET.w - 4, 14);
  ctx.fillRect(b.x - hw + 12, b.y - 36, BUCKET.w - 24, 12);
  rr(ctx, b.x - hw - 14, top - 10, BUCKET.w + 28, 22, 11);
  fillStroke(ctx, '#62acf0');
  // face
  const fy = top + 95;
  ctx.fillStyle = C.ink;
  if (mood === 'win') {
    ctx.lineWidth = 6;
    ctx.strokeStyle = C.ink;
    for (const dx of [-38, 38]) {
      ctx.beginPath();
      ctx.arc(b.x + dx, fy - 8, 12, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(b.x, fy + 8, 26, 0, Math.PI);
    ctx.fill();
  } else {
    for (const dx of [-38, 38]) {
      circle(ctx, b.x + dx, fy - 8, 13);
      ctx.fillStyle = '#fff';
      ctx.fill();
      circle(ctx, b.x + dx + 2, fy - 6, 7);
      ctx.fillStyle = C.ink;
      ctx.fill();
    }
    if (mood === 'near') {
      ctx.beginPath();
      ctx.ellipse(b.x, fy + 22, 13, 17, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.lineWidth = 6;
      ctx.strokeStyle = C.ink;
      ctx.beginPath();
      ctx.arc(b.x, fy + 8, 20, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    }
  }
  // cheeks
  ctx.fillStyle = 'rgba(255,120,150,0.55)';
  circle(ctx, b.x - 64, fy + 14, 11);
  ctx.fill();
  circle(ctx, b.x + 64, fy + 14, 11);
  ctx.fill();
  ctx.restore();
}

export function drawBall(ctx, x, y, rot, vx = 0, vy = 0, squash = 0) {
  ctx.save();
  ctx.translate(x, y);
  // shadow-ish outline + body
  ctx.save();
  ctx.scale(1 + squash * 0.25, 1 - squash * 0.25);
  circle(ctx, 0, 0, BALL_R);
  fillStroke(ctx, C.ball, C.ink, 6);
  // rolling stripe
  ctx.save();
  circle(ctx, 0, 0, BALL_R - 3);
  ctx.clip();
  ctx.rotate(rot);
  ctx.fillStyle = '#ffd23c';
  ctx.fillRect(-BALL_R, -7, BALL_R * 2, 14);
  ctx.restore();
  ctx.restore();
  // highlight
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath();
  ctx.ellipse(-12, -16, 10, 6, -0.6, 0, Math.PI * 2);
  ctx.fill();
  // eyes look where the ball is going
  const sp = Math.hypot(vx, vy);
  const lx = sp > 30 ? (vx / sp) * 3.5 : 0;
  const ly = sp > 30 ? (vy / sp) * 3.5 : 1.5;
  for (const dx of [-11, 11]) {
    ctx.beginPath();
    ctx.ellipse(dx, -2, 7.5, 9.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
    circle(ctx, dx + lx, -2 + ly, 4);
    ctx.fillStyle = C.ink;
    ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- pieces

export function drawPiece(ctx, p, t, opts = {}) {
  const { running = false, ghost = false, icon = false } = opts;
  const effects = !ghost && !icon; // wind lines, magnet rings
  ctx.save();
  if (ghost) ctx.globalAlpha = 0.4 + 0.2 * Math.sin(t * 6);
  switch (p.type) {
    case 'ramp': {
      const [ax, ay, bx, by] = rampEnds(p);
      drawPlank(ctx, ax, ay, bx, by, RAMP.r + 7, C.ramp, C.rampDark);
      // arrow showing downhill
      const mx = (ax + bx) / 2;
      const my = (ay + by) / 2;
      ctx.translate(mx, my);
      ctx.rotate(RAMP.tilt * p.dir);
      ctx.fillStyle = 'rgba(160,90,0,0.55)';
      ctx.beginPath();
      const d = p.dir;
      ctx.moveTo(18 * d, 0);
      ctx.lineTo(-6 * d, -9);
      ctx.lineTo(-6 * d, 9);
      ctx.fill();
      break;
    }
    case 'tramp': {
      const { w, h } = TRAMP;
      const sq = p.squash || 0;
      const baseY = p.y + h / 2 - 18;
      const padY = p.y - h / 2 + 10 + sq * 14;
      rr(ctx, p.x - w / 2, baseY, w, 18, 8);
      fillStroke(ctx, C.trampBase, C.ink, 5);
      for (const sx of [-w / 2 + 34, w / 2 - 34]) {
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 9;
        zigzag(ctx, p.x + sx, baseY, padY + 8);
        ctx.strokeStyle = C.spring;
        ctx.lineWidth = 4;
        zigzag(ctx, p.x + sx, baseY, padY + 8);
      }
      rr(ctx, p.x - w / 2 + 2, padY - 11, w - 4, 22, 11);
      fillStroke(ctx, C.trampPad, C.ink, 5);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      for (let i = -2; i <= 2; i++) {
        ctx.fillRect(p.x + i * 30 - 6, padY - 7, 12, 6);
      }
      break;
    }
    case 'fan': {
      const s = FAN.size / 2;
      const d = p.dir;
      // wind lines
      if (effects) {
        const reach = FAN.reach;
        ctx.save();
        ctx.globalAlpha = running ? 0.55 : 0.28;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        for (let i = 0; i < 5; i++) {
          const yy = p.y - FAN.band / 2 + 18 + i * ((FAN.band - 36) / 4);
          const speed = running ? 420 : 90;
          const off = ((t * speed + i * 137) % reach);
          const x0 = p.x + d * (s + off);
          ctx.beginPath();
          ctx.moveTo(x0, yy);
          ctx.quadraticCurveTo(x0 + d * 30, yy - 8, x0 + d * 60, yy);
          ctx.stroke();
        }
        ctx.restore();
      }
      // stand
      ctx.fillStyle = C.ink;
      ctx.fillRect(p.x - 8, p.y + s - 4, 16, 10);
      rr(ctx, p.x - s, p.y - s, FAN.size, FAN.size, 22);
      fillStroke(ctx, C.fan);
      // grill + blades
      circle(ctx, p.x + d * 4, p.y, s - 12);
      fillStroke(ctx, '#dff1ff', C.fanDark, 4);
      ctx.save();
      ctx.translate(p.x + d * 4, p.y);
      ctx.rotate(t * (running ? 22 : 3) * d);
      ctx.fillStyle = C.fanDark;
      for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 2);
        ctx.beginPath();
        ctx.ellipse(0, -17, 9, 17, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      circle(ctx, 0, 0, 7);
      ctx.fillStyle = C.ink;
      ctx.fill();
      ctx.restore();
      // arrow nub showing blow direction
      ctx.fillStyle = C.ink;
      ctx.beginPath();
      ctx.moveTo(p.x + d * (s + 22), p.y);
      ctx.lineTo(p.x + d * (s + 4), p.y - 16);
      ctx.lineTo(p.x + d * (s + 4), p.y + 16);
      ctx.fill();
      break;
    }
    case 'conveyor': {
      const hl = CONV.len / 2;
      const r = CONV.r;
      rr(ctx, p.x - hl - r, p.y - r, CONV.len + 2 * r, 2 * r, r);
      fillStroke(ctx, C.belt);
      // moving chevrons
      ctx.save();
      rr(ctx, p.x - hl, p.y - r + 5, CONV.len, 2 * r - 10, 6);
      ctx.clip();
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = 5;
      const speed = running ? CONV.speed * 0.5 : 60;
      const off = (t * speed) % 40;
      for (let x = -hl - 40; x < hl + 40; x += 40) {
        const cx = p.x + x + off * p.dir;
        ctx.beginPath();
        ctx.moveTo(cx - 6 * p.dir, p.y - 9);
        ctx.lineTo(cx + 6 * p.dir, p.y);
        ctx.lineTo(cx - 6 * p.dir, p.y + 9);
        ctx.stroke();
      }
      ctx.restore();
      // wheels
      for (const wx of [p.x - hl, p.x + hl]) {
        circle(ctx, wx, p.y, r - 3);
        fillStroke(ctx, C.wheel, C.ink, 4);
        ctx.save();
        ctx.translate(wx, p.y);
        ctx.rotate(t * (running ? 14 : 2) * p.dir);
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-r + 6, 0);
        ctx.lineTo(r - 6, 0);
        ctx.moveTo(0, -r + 6);
        ctx.lineTo(0, r - 6);
        ctx.stroke();
        ctx.restore();
      }
      break;
    }
    case 'bumper': {
      const sq = p.squash || 0;
      const r = BUMPER.r * (1 + sq * 0.18);
      circle(ctx, p.x, p.y, r);
      fillStroke(ctx, sq > 0.3 ? '#ffd1e8' : C.bumper);
      circle(ctx, p.x, p.y, r * 0.66);
      fillStroke(ctx, '#ffffff', C.ink, 4);
      drawStar(ctx, p.x, p.y, r * 0.42, '#ffd23c', 3);
      break;
    }
    case 'magnet': {
      // pulsing field rings so kids can see its reach
      if (effects) {
        ctx.save();
        ctx.strokeStyle = '#ff4d4d';
        ctx.lineWidth = 4;
        ctx.setLineDash([10, 14]);
        for (let i = 0; i < 2; i++) {
          const k = ((t * (running ? 0.9 : 0.35) + i * 0.5) % 1);
          ctx.globalAlpha = 0.35 * (1 - k);
          circle(ctx, p.x, p.y, MAGNET.range * (1 - k));
          ctx.stroke();
        }
        ctx.restore();
      }
      const R = 28;
      const top = p.y - 40;
      ctx.lineCap = 'butt';
      const u = () => {
        ctx.beginPath();
        ctx.moveTo(p.x - R, top);
        ctx.lineTo(p.x - R, p.y + 4);
        ctx.arc(p.x, p.y + 4, R, Math.PI, 0, true);
        ctx.lineTo(p.x + R, top);
      };
      u();
      ctx.lineWidth = 36;
      ctx.strokeStyle = C.ink;
      ctx.stroke();
      u();
      ctx.lineWidth = 24;
      ctx.strokeStyle = C.magnet;
      ctx.stroke();
      for (const sx of [-R, R]) {
        rr(ctx, p.x + sx - 17, top - 8, 34, 22, 4);
        fillStroke(ctx, C.steel, C.ink, 5);
      }
      break;
    }
    case 'cannon': {
      const g = cannonGeom(p);
      const recoil = (p.squash || 0) * 14;
      // barrel
      ctx.save();
      ctx.translate(g.cx, g.cy);
      ctx.scale(p.dir, 1);
      ctx.rotate(-CANNON.angle);
      ctx.translate(-recoil, 0);
      rr(ctx, -34, -30, CANNON.barrel + 44, 60, 24);
      fillStroke(ctx, C.cannon);
      rr(ctx, CANNON.barrel - 6, -35, 20, 70, 8);
      fillStroke(ctx, '#ffd23c', C.ink, 5);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(-20, -20, CANNON.barrel, 10);
      ctx.restore();
      // carriage + wheel
      rr(ctx, p.x - 50, p.y + 28, 100, 32, 12);
      fillStroke(ctx, '#b97c47', C.ink, 5);
      circle(ctx, p.x, p.y + 30, 26);
      fillStroke(ctx, '#8a5528', C.ink, 5);
      circle(ctx, p.x, p.y + 30, 8);
      ctx.fillStyle = C.ink;
      ctx.fill();
      break;
    }
    case 'funnel': {
      for (const [ax, ay, bx, by] of funnelSegs(p)) drawPlank(ctx, ax, ay, bx, by, 14, C.funnel, C.funnelDark);
      ctx.fillStyle = 'rgba(46,196,182,0.18)';
      const [[lx0, ly0, lx1, ly1], [rx0, , rx1]] = funnelSegs(p);
      ctx.beginPath();
      ctx.moveTo(lx0, ly0);
      ctx.lineTo(lx1, ly1);
      ctx.lineTo(rx1, ly1);
      ctx.lineTo(rx0, ly0);
      ctx.fill();
      break;
    }
    case 'slide': {
      const pts = slidePoints(p);
      const path = () => {
        ctx.beginPath();
        pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      };
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      path();
      ctx.lineWidth = 2 * SLIDE.r + 20;
      ctx.strokeStyle = C.ink;
      ctx.stroke();
      path();
      ctx.lineWidth = 2 * SLIDE.r + 8;
      ctx.strokeStyle = C.slide;
      ctx.stroke();
      path();
      ctx.lineWidth = 5;
      ctx.strokeStyle = C.slideLight;
      ctx.stroke();
      break;
    }
    case 'portal': {
      const col = C.portals[(opts.portalIndex || 0) % 2];
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.beginPath();
      ctx.ellipse(0, 0, PORTAL.r, PORTAL.r * 1.2, 0, 0, Math.PI * 2);
      fillStroke(ctx, '#1d1640', C.ink, 6);
      ctx.rotate(t * (running ? 4 : 1.5));
      for (let i = 0; i < 3; i++) {
        ctx.rotate((Math.PI * 2) / 3);
        ctx.beginPath();
        ctx.ellipse(0, 0, PORTAL.r * (0.35 + i * 0.2), PORTAL.r * (0.45 + i * 0.22), 0, 0, Math.PI * 1.2);
        ctx.lineWidth = 7;
        ctx.strokeStyle = col;
        ctx.globalAlpha = 0.5 + i * 0.2;
        ctx.stroke();
      }
      ctx.restore();
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, PORTAL.r, PORTAL.r * 1.2, 0, 0, Math.PI * 2);
      ctx.lineWidth = 10;
      ctx.strokeStyle = col;
      ctx.stroke();
      break;
    }
  }
  drawNewPiece(ctx, p, t, { running, effects });
  if (opts.fixed) {
    // bolt: this piece is part of the level and can't be moved
    circle(ctx, p.x, p.y, 11);
    fillStroke(ctx, '#c9d1e0', C.ink, 4);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(p.x - 6, p.y);
    ctx.lineTo(p.x + 6, p.y);
    ctx.stroke();
  }
  ctx.restore();
}

// The second set of pieces (plank .. spinner).
function drawNewPiece(ctx, p, t, { running, effects }) {
  const d = p.dir;
  const sq = p.squash || 0;
  switch (p.type) {
    case 'plank':
      drawPlank(ctx, p.x - PLANK.len / 2, p.y, p.x + PLANK.len / 2, p.y, PLANK.r + 7, C.plank, C.plankDark);
      break;
    case 'block': {
      const s = BLOCK.size / 2;
      drawBlock(ctx, p.x - s, p.y - s, BLOCK.size, BLOCK.size);
      break;
    }
    case 'jelly': {
      const s = JELLY.size / 2;
      ctx.save();
      ctx.translate(p.x, p.y + s);
      ctx.scale(1 + sq * 0.14, 1 - sq * 0.14);
      rr(ctx, -s, -JELLY.size, JELLY.size, JELLY.size, 24);
      fillStroke(ctx, C.jelly);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      rr(ctx, -s + 14, -JELLY.size + 12, 30, 16, 8);
      ctx.fill();
      // sleepy face
      ctx.fillStyle = C.ink;
      circle(ctx, -18, -s - 4, 6);
      ctx.fill();
      circle(ctx, 18, -s - 4, 6);
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = C.ink;
      ctx.beginPath();
      ctx.arc(0, -s + 8, 12, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case 'glove': {
      const s = GLOVE.size / 2;
      // spring + glove pop out on a punch
      const out = 6 + sq * 34;
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + d * (s + out - 20), p.y);
      ctx.stroke();
      rr(ctx, p.x - s, p.y - s, GLOVE.size, GLOVE.size, 18);
      fillStroke(ctx, '#ffd23c');
      ctx.fillStyle = C.ink;
      ctx.beginPath();
      ctx.moveTo(p.x + d * 22, p.y);
      ctx.lineTo(p.x - d * 8, p.y - 18);
      ctx.lineTo(p.x - d * 8, p.y + 18);
      ctx.fill();
      // the glove
      ctx.save();
      ctx.translate(p.x + d * (s + out), p.y);
      ctx.scale(d, 1);
      rr(ctx, -22, -32, 54, 64, 26);
      fillStroke(ctx, C.glove);
      rr(ctx, -30, -24, 16, 48, 6);
      fillStroke(ctx, '#ffffff', C.ink, 5);
      circle(ctx, 4, -34, 13);
      fillStroke(ctx, C.glove, C.ink, 5);
      ctx.restore();
      break;
    }
    case 'pipe': {
      const s = PIPE.size / 2;
      // body
      rr(ctx, p.x - s + 8, p.y - s + 8, PIPE.size - 16, PIPE.size - 16, 16);
      fillStroke(ctx, C.pipeBody);
      // top mouth
      rr(ctx, p.x - s, p.y - s - 12, PIPE.size, 30, 10);
      fillStroke(ctx, C.pipeBody);
      ctx.fillStyle = C.ink;
      rr(ctx, p.x - s + 14, p.y - s - 6, PIPE.size - 28, 12, 6);
      ctx.fill();
      // side mouth
      rr(ctx, p.x + d * s - (d > 0 ? 10 : 20), p.y - 32, 30, 88, 10);
      fillStroke(ctx, C.pipeBody);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(p.x - s + 20, p.y - s + 22, 12, PIPE.size - 44);
      // arrow: down then out
      ctx.fillStyle = C.ink;
      ctx.beginPath();
      ctx.moveTo(p.x + d * 22, p.y + 12);
      ctx.lineTo(p.x - d * 2, p.y - 6);
      ctx.lineTo(p.x - d * 2, p.y + 30);
      ctx.fill();
      break;
    }
    case 'escalator': {
      const [ax, ay, bx, by] = escalatorEnds(p);
      const len = Math.hypot(bx - ax, by - ay);
      const r = ESC.r;
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(Math.atan2(by - ay, bx - ax));
      rr(ctx, -r, -r, len + 2 * r, 2 * r, r);
      fillStroke(ctx, C.esc);
      ctx.save();
      rr(ctx, 0, -r + 5, len, 2 * r - 10, 6);
      ctx.clip();
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = 5;
      const off = (t * (running ? ESC.speed * 0.5 : 60)) % 40;
      for (let x = -40; x < len + 40; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x + off - 6, -9);
        ctx.lineTo(x + off + 6, 0);
        ctx.lineTo(x + off - 6, 9);
        ctx.stroke();
      }
      ctx.restore();
      for (const wx of [0, len]) {
        circle(ctx, wx, 0, r - 3);
        fillStroke(ctx, C.wheel, C.ink, 4);
      }
      ctx.restore();
      break;
    }
    case 'blower': {
      const s = BLOWER.size / 2;
      if (effects) {
        ctx.save();
        ctx.globalAlpha = running ? 0.55 : 0.28;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        for (let i = 0; i < 4; i++) {
          const xx = p.x - BLOWER.band / 2 + 22 + i * ((BLOWER.band - 44) / 3);
          const off = (t * (running ? 420 : 90) + i * 137) % BLOWER.reach;
          const y0 = p.y - s - off;
          ctx.beginPath();
          ctx.moveTo(xx, y0);
          ctx.quadraticCurveTo(xx - 8, y0 - 30, xx, y0 - 60);
          ctx.stroke();
        }
        ctx.restore();
      }
      rr(ctx, p.x - s, p.y - s + 10, BLOWER.size, BLOWER.size - 10, 20);
      fillStroke(ctx, C.blower);
      rr(ctx, p.x - s - 6, p.y - s, BLOWER.size + 12, 26, 10);
      fillStroke(ctx, '#ffd9a8');
      ctx.fillStyle = C.ink;
      for (let i = -1; i <= 1; i++) ctx.fillRect(p.x + i * 26 - 8, p.y - s + 8, 16, 9);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - 4);
      ctx.lineTo(p.x - 20, p.y + 24);
      ctx.lineTo(p.x + 20, p.y + 24);
      ctx.fill();
      break;
    }
    case 'cloud': {
      ctx.save();
      ctx.globalAlpha *= 0.92;
      const bob = Math.sin(t * 2 + p.x) * 3;
      ctx.beginPath();
      ctx.ellipse(p.x - 55, p.y + 14 + bob, 62, 48, 0, 0, Math.PI * 2);
      ctx.ellipse(p.x + 5, p.y - 18 + bob, 70, 56, 0, 0, Math.PI * 2);
      ctx.ellipse(p.x + 62, p.y + 14 + bob, 58, 46, 0, 0, Math.PI * 2);
      ctx.ellipse(p.x, p.y + 28 + bob, 80, 40, 0, 0, Math.PI * 2);
      ctx.lineWidth = 12;
      ctx.strokeStyle = C.ink;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      // sleepy eyes
      ctx.lineWidth = 5;
      ctx.strokeStyle = C.ink;
      for (const ex of [-24, 24]) {
        ctx.beginPath();
        ctx.arc(p.x + ex, p.y + 4 + bob, 10, Math.PI * 0.1, Math.PI * 0.9);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }
    case 'balloon': {
      if (p.popped) break;
      drawBalloon(ctx, p.x, p.y, d, t);
      break;
    }
    case 'spinner': {
      // stand
      ctx.fillStyle = C.ink;
      circle(ctx, p.x, p.y, 16);
      ctx.fill();
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.spin ?? (effects ? t * 0.6 * d : 0));
      for (let k = 0; k < 4; k++) {
        ctx.rotate(Math.PI / 2);
        rr(ctx, 6, -SPINNER.r - 5, SPINNER.R - 6, 2 * SPINNER.r + 10, SPINNER.r + 5);
        fillStroke(ctx, C.spinner[k], C.ink, 5);
      }
      ctx.restore();
      circle(ctx, p.x, p.y, 13);
      fillStroke(ctx, '#ffffff', C.ink, 5);
      // little arrow showing which way it turns
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7, d > 0 ? -2.4 : -0.7, d > 0 ? 0.6 : 2.3 - Math.PI * 2, d < 0);
      ctx.stroke();
      break;
    }
  }
}

export function drawBalloon(ctx, x, y, d, t) {
  const sway = Math.sin(t * 2.5 + x) * 4;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, y + BALLOON.r * 1.15);
  ctx.quadraticCurveTo(x + sway, y + BALLOON.r * 1.15 + 20, x, y + BALLOON.r * 1.15 + 40);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(x, y, BALLOON.r, BALLOON.r * 1.15, 0, 0, Math.PI * 2);
  fillStroke(ctx, C.balloon);
  ctx.beginPath();
  ctx.moveTo(x - 9, y + BALLOON.r * 1.15 - 2);
  ctx.lineTo(x + 9, y + BALLOON.r * 1.15 - 2);
  ctx.lineTo(x, y + BALLOON.r * 1.15 + 12);
  ctx.closePath();
  fillStroke(ctx, C.balloon, C.ink, 4);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath();
  ctx.ellipse(x - 18, y - 22, 12, 18, -0.5, 0, Math.PI * 2);
  ctx.fill();
  // arrow: which way it drifts
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.moveTo(x + d * 24, y - 12);
  ctx.lineTo(x + d * 2, y - 14);
  ctx.lineTo(x + d * 14, y + 10);
  ctx.fill();
}

function zigzag(ctx, x, y0, y1) {
  const n = 5;
  ctx.beginPath();
  ctx.moveTo(x, y0);
  for (let i = 1; i <= n; i++) {
    const y = y0 + ((y1 - y0) * i) / n;
    ctx.lineTo(i === n ? x : x + (i % 2 ? 14 : -14), y);
  }
  ctx.stroke();
}

export function drawGhostOutline(ctx, p, t) {
  const b = pieceBounds(p);
  const pad = 16;
  ctx.save();
  ctx.setLineDash([14, 10]);
  ctx.lineDashOffset = -t * 40;
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  rr(ctx, b.x0 - pad, b.y0 - pad, b.x1 - b.x0 + pad * 2, b.y1 - b.y0 + pad * 2, 20);
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- UI

export function drawTray(ctx, game, t, ext) {
  const x = UI.trayX;
  ctx.save();
  rr(ctx, x + 6, -40, ext.x1 - x + 40, VIEW.H + 80, 36);
  fillStroke(ctx, C.tray, C.ink, 6);
  ctx.restore();

  drawIconButton(ctx, UI.home, '#ffffff', (c) => houseIcon(c));
  drawIconButton(ctx, UI.music, game.musicOn ? '#ffffff' : '#d9d9e3', (c) => noteIcon(c, game.musicOn));

  const n = game.level.tray.length;
  game.level.tray.forEach((slot, i) => {
    const r = UI.slot(i, n);
    const count = game.inventory[i];
    ctx.save();
    rr(ctx, r.x, r.y, r.w, r.h, 26);
    fillStroke(ctx, count > 0 ? '#fff8ea' : '#f1dfbd', C.trayDark, 5);
    if (count <= 0) ctx.globalAlpha = 0.3;
    const icon = slotIcon(slot.type, r);
    ctx.translate(icon.x, icon.y);
    ctx.scale(icon.s, icon.s);
    ctx.translate(-icon.x, -icon.y);
    drawPiece(ctx, { type: slot.type, x: icon.x, y: icon.y, dir: 1 }, t, { icon: true });
    ctx.restore();
    // count dots
    const total = slot.count;
    const dr = r.h < 180 ? 9 : 12;
    for (let k = 0; k < total; k++) {
      const dx = r.x + r.w / 2 + (k - (total - 1) / 2) * (dr * 2.8);
      circle(ctx, dx, r.y + r.h - dr * 2.4, dr);
      fillStroke(ctx, k < count ? '#34c759' : '#e4d3b0', C.ink, 4);
    }
  });

  // Go / stop button
  const running = game.mode === 'run';
  const pulse = game.mode === 'edit' && game.readyToGo ? 1 + 0.06 * Math.sin(t * 7) : 1;
  ctx.save();
  ctx.translate(UI.go.x, UI.go.y);
  ctx.scale(pulse, pulse);
  circle(ctx, 0, 6, UI.go.r);
  ctx.fillStyle = running ? C.stopDark : C.goDark;
  ctx.fill();
  circle(ctx, 0, 0, UI.go.r);
  fillStroke(ctx, running ? C.stop : C.go, C.ink, 7);
  ctx.fillStyle = '#fff';
  if (running) {
    rr(ctx, -34, -34, 68, 68, 12);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(-26, -44);
    ctx.lineTo(48, 0);
    ctx.lineTo(-26, 44);
    ctx.closePath();
    ctx.lineJoin = 'round';
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#fff';
    ctx.stroke();
    ctx.fill();
  }
  ctx.restore();
}

const ICON_SCALE = {
  ramp: 0.72, tramp: 0.85, fan: 0.85, conveyor: 0.72, bumper: 1,
  magnet: 1, cannon: 0.8, funnel: 0.85, slide: 0.55, portal: 0.85,
  plank: 0.75, block: 1, jelly: 0.95, glove: 0.9, pipe: 0.85,
  escalator: 0.68, blower: 0.9, cloud: 0.8, balloon: 0.8, spinner: 0.6,
};

export function trayIcon(type, cx, cy, k = 1) {
  return { x: cx, y: cy, s: (ICON_SCALE[type] ?? 0.8) * k };
}

// Icon placement inside a tray slot (slots shrink when there are many).
export function slotIcon(type, r) {
  const k = Math.min(1, r.h / 205);
  return trayIcon(type, r.x + r.w / 2, r.y + r.h / 2 - 16 * k, k);
}

export function drawIconButton(ctx, b, fill, icon) {
  circle(ctx, b.x, b.y + 5, b.r);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fill();
  circle(ctx, b.x, b.y, b.r);
  fillStroke(ctx, fill, C.ink, 6);
  ctx.save();
  ctx.translate(b.x, b.y);
  icon(ctx);
  ctx.restore();
}

function houseIcon(ctx) {
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.moveTo(0, -26);
  ctx.lineTo(28, 0);
  ctx.lineTo(20, 0);
  ctx.lineTo(20, 24);
  ctx.lineTo(-20, 24);
  ctx.lineTo(-20, 0);
  ctx.lineTo(-28, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillRect(-7, 8, 14, 16);
}

function noteIcon(ctx, on) {
  ctx.fillStyle = C.ink;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.ellipse(-12, 16, 11, 8, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(16, 10, 11, 8, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-3, 14);
  ctx.lineTo(-3, -24);
  ctx.lineTo(25, -30);
  ctx.lineTo(25, 8);
  ctx.stroke();
  if (!on) {
    ctx.strokeStyle = '#e5484d';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(-32, -32);
    ctx.lineTo(32, 32);
    ctx.stroke();
  }
}

function replayIcon(ctx) {
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 16;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, 0, 38, -Math.PI * 0.3, Math.PI * 1.35);
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(44, -48);
  ctx.lineTo(48, 0);
  ctx.lineTo(6, -22);
  ctx.closePath();
  ctx.fill();
}

function nextIcon(ctx) {
  ctx.fillStyle = '#fff';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 12;
  for (const dx of [-26, 18]) {
    ctx.beginPath();
    ctx.moveTo(dx - 20, -40);
    ctx.lineTo(dx + 26, 0);
    ctx.lineTo(dx - 20, 40);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

export function drawStar(ctx, x, y, r, fill = '#ffd23c', lw = 6) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? r * 0.48 : r;
    ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.lineJoin = 'round';
  fillStroke(ctx, fill, C.ink, lw);
}

export function drawWinOverlay(ctx, game, t, ext) {
  const k = Math.min(1, game.wonT / 0.6);
  ctx.fillStyle = `rgba(40, 30, 80, ${0.35 * k})`;
  ctx.fillRect(ext.x0, ext.y0, ext.x1 - ext.x0, ext.y1 - ext.y0);
  if (game.wonT < 0.9) return;
  const s = Math.min(1, (game.wonT - 0.9) / 0.35);
  const ease = 1 + 0.3 * Math.sin(s * Math.PI);
  for (let i = 0; i < 3; i++) {
    const x = 640 + i * 160;
    const y = 360 - (i === 1 ? 50 : 0) + Math.sin(t * 4 + i) * 10;
    drawStar(ctx, x, y, (i === 1 ? 95 : 75) * s * ease);
  }
  if (game.wonT < 1.3) return;
  const last = game.levelIndex >= game.levelCount - 1;
  const btns = last ? [{ b: { ...UI.replay, x: 800 }, fill: C.fan, icon: replayIcon }]
    : [
        { b: UI.replay, fill: C.fan, icon: replayIcon },
        { b: UI.next, fill: C.go, icon: nextIcon, pulse: true },
      ];
  for (const { b, fill, icon, pulse } of btns) {
    const sc = pulse ? 1 + 0.07 * Math.sin(t * 6) : 1;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.scale(sc, sc);
    drawIconButton(ctx, { x: 0, y: 0, r: b.r }, fill, icon);
    ctx.restore();
  }
}

export function drawHand(ctx, x, y, press = 0) {
  ctx.save();
  ctx.translate(x, y + press * 10);
  ctx.font = `110px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 12;
  ctx.fillText('👆', 10, -10);
  ctx.restore();
}

export function drawParticles(ctx, parts) {
  for (const p of parts) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 2));
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    if (p.kind === 'confetti') {
      ctx.fillStyle = p.color;
      ctx.fillRect(-10, -5, 20, 10);
    } else if (p.kind === 'puff') {
      circle(ctx, 0, 0, p.size);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    } else if (p.kind === 'star' || p.kind === 'sparkle') {
      drawStar(ctx, 0, 0, p.size);
    }
    ctx.restore();
  }
}

// ---------------------------------------------------------------- menu

// Level select: one page per world, 5 levels each.
export function drawLevelSelect(ctx, game, t, ext) {
  const page = game.page;
  drawBackground(ctx, t, ext, THEMES[page % THEMES.length]);

  // title
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 104px ${FONT}`;
  ctx.lineJoin = 'round';
  ctx.lineWidth = 20;
  ctx.strokeStyle = C.ink;
  const ty = 150 + Math.sin(t * 2) * 5;
  ctx.strokeText('Ball Machine', 860, ty);
  const tg = ctx.createLinearGradient(0, ty - 55, 0, ty + 55);
  tg.addColorStop(0, '#ffe36e');
  tg.addColorStop(1, '#ff9f1c');
  ctx.fillStyle = tg;
  ctx.fillText('Ball Machine', 860, ty);
  ctx.restore();

  // bouncing mascots
  ctx.save();
  ctx.translate(1500, 250);
  ctx.scale(0.8, 0.8);
  drawBucket(ctx, { x: 0, y: 0 }, 'near', t);
  drawBall(ctx, -230, -130 - Math.abs(Math.sin(t * 3)) * 90, t * 3, 0, 200);
  ctx.restore();

  // row of world dots
  const pages = Math.ceil(game.levelCount / UI.levelsPerPage);
  for (let k = 0; k < pages; k++) {
    circle(ctx, 960 + (k - (pages - 1) / 2) * 56, 925, k === page ? 18 : 12);
    fillStroke(ctx, k === page ? '#ffd23c' : '#ffffff', C.ink, 5);
  }

  for (let i = 0; i < UI.levelsPerPage; i++) {
    const li = page * UI.levelsPerPage + i;
    if (li >= game.levelCount) break;
    const r = UI.levelBtn(i);
    const done = game.progress.done.includes(game.levels[li].key);
    const bob = Math.sin(t * 3 + i) * 6;
    ctx.save();
    ctx.translate(0, bob);
    rr(ctx, r.x, r.y + 9, r.w, r.h, 40);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fill();
    rr(ctx, r.x, r.y, r.w, r.h, 40);
    fillStroke(ctx, ['#ffc93c', '#ff7eb0', '#6fd3ff', '#8be07a', '#c9a7ff'][(i + Math.floor(i / 5) * 2) % 5], C.ink, 8);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 104px ${FONT}`;
    ctx.lineWidth = 15;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = C.ink;
    ctx.strokeText(String(li + 1), r.x + r.w / 2, r.y + r.h / 2 - 28);
    ctx.fillStyle = '#fff';
    ctx.fillText(String(li + 1), r.x + r.w / 2, r.y + r.h / 2 - 28);
    // piece icons for this level
    const types = [...new Set(game.levels[li].tray.map((s) => s.type))];
    const sc = [0.44, 0.32, 0.24, 0.19][types.length - 1] ?? 0.18;
    const gap = r.w / (types.length + 0.2);
    types.forEach((type, k) => {
      ctx.save();
      ctx.translate(r.x + r.w / 2 + (k - (types.length - 1) / 2) * gap, r.y + r.h - 50);
      ctx.scale(sc, sc);
      drawPiece(ctx, { type, x: 0, y: 0, dir: 1 }, t, { icon: true });
      ctx.restore();
    });
    if (done) drawStar(ctx, r.x + r.w - 18, r.y + 18, 36);
    ctx.restore();
  }

  if (page > 0) drawIconButton(ctx, UI.pagePrev, '#ffffff', (c) => arrowIcon(c, -1));
  if (page < pages - 1) drawIconButton(ctx, UI.pageNext, '#ffffff', (c) => arrowIcon(c, 1));
  drawIconButton(ctx, UI.music, game.musicOn ? '#ffffff' : '#d9d9e3', (c) => noteIcon(c, game.musicOn));
}

function arrowIcon(ctx, d) {
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.moveTo(-18 * d, -30);
  ctx.lineTo(24 * d, 0);
  ctx.lineTo(-18 * d, 30);
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 8;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  ctx.fill();
}

export function drawLevel(ctx, game, t, ext) {
  const L = game.level;
  drawBackground(ctx, t, ext, THEMES[Math.floor(game.levelIndex / UI.levelsPerPage) % THEMES.length]);
  for (const b of L.blocks || []) drawBlock(ctx, b[0], b[1], b[2], b[3]);
  for (const w of L.walls || []) drawPlank(ctx, w[0], w[1], w[2], w[3], w[4] ?? 12, C.beam, C.beamDark);
  drawPipe(ctx, L.ball.x, L.ball.y);

  const running = game.mode === 'run' || game.mode === 'won';
  // Portals pair up in order (fixed first, then placed), so colour them by position.
  let portalIndex = 0;
  const portalOpts = (p) => (p.type === 'portal' ? { portalIndex: portalIndex++ } : {});
  for (const p of L.fixed || []) drawPiece(ctx, p, t, { running, fixed: true, ...portalOpts(p) });

  // hint ghosts under the real pieces
  if (game.hints.length && game.mode === 'edit') {
    for (const h of game.hints) {
      drawPiece(ctx, h, t, { ghost: true });
      drawGhostOutline(ctx, h, t);
    }
  }
  for (const p of game.placed) {
    const o = portalOpts(p);
    if (game.drag && game.drag.piece === p) {
      game.drag.portalIndex = o.portalIndex;
      continue;
    }
    drawPiece(ctx, p, t, { running, ...o });
  }

  const ball = game.ballView;
  // Ball first so that once it drops in, the bucket's front hides it.
  if (ball.carriedBy) drawBalloon(ctx, ball.x, ball.y - 100, ball.carriedBy.dir, t);
  if (ball.visible) drawBall(ctx, ball.x, ball.y, ball.rot, ball.vx, ball.vy, ball.squash);
  drawBucket(ctx, L.bucket, game.bucketMood, t);

  drawParticles(ctx, game.particles);
}
