// Shared helpers for level tests and design tools.
import { pieceBounds } from '../js/pieces.js';
import { WORLD, BALL_R, BUCKET } from '../js/physics.js';

const overlaps = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

function segNearRect(w, r) {
  const [ax, ay, bx, by, rad = 12] = w;
  const n = Math.max(2, Math.ceil(Math.hypot(bx - ax, by - ay) / 8));
  for (let i = 0; i <= n; i++) {
    const x = ax + ((bx - ax) * i) / n;
    const y = ay + ((by - ay) * i) / n;
    const dx = Math.max(r.x0 - x, 0, x - r.x1);
    const dy = Math.max(r.y0 - y, 0, y - r.y1);
    if (Math.hypot(dx, dy) < rad) return true;
  }
  return false;
}

// Returns a list of reasons a placement looks wrong (pieces inside walls etc.).
export function placementIssues(level, pieces) {
  const issues = [];
  const all = [...(level.fixed || []), ...pieces];
  const hw = BUCKET.w / 2 + 14;
  const bucket = { x0: level.bucket.x - hw, y0: level.bucket.y - BUCKET.h - 14, x1: level.bucket.x + hw, y1: level.bucket.y };
  const pipe = { x0: level.ball.x - 62, y0: -100, x1: level.ball.x + 62, y1: level.ball.y + BALL_R };
  all.forEach((p, i) => {
    const b0 = pieceBounds(p);
    const b = { x0: b0.x0 + 4, y0: b0.y0 + 4, x1: b0.x1 - 4, y1: b0.y1 - 4 };
    const name = `${p.type}@${p.x},${p.y}`;
    if (b.x0 < 0 || b.x1 > WORLD.W || b.y1 > WORLD.FLOOR + 2) issues.push(`${name} out of bounds`);
    for (const k of level.blocks || []) if (overlaps(b, { x0: k[0], y0: k[1], x1: k[0] + k[2], y1: k[1] + k[3] })) issues.push(`${name} hits block`);
    for (const w of level.walls || []) if (segNearRect(w, b)) issues.push(`${name} hits wall`);
    if (overlaps(b, bucket)) issues.push(`${name} hits bucket`);
    if (overlaps(b, pipe)) issues.push(`${name} hits pipe`);
    for (let j = i + 1; j < all.length; j++) if (overlaps(b, pieceBounds(all[j]))) issues.push(`${name} hits ${all[j].type}`);
  });
  return issues;
}
