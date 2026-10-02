// Level design helper. For each solution piece, searches nearby placements and
// moves it to the most forgiving winning spot (most winning neighbours).
// Usage: node tests/autotune.mjs <levelNumber> [window=200] [passes=2] [--write]
// --write replaces that level's solution in js/levels.js.
import { readFileSync, writeFileSync } from 'node:fs';
import { LEVELS } from '../js/levels.js';
import { runToEnd } from '../js/physics.js';
import { placementIssues } from './lib.mjs';

const level = LEVELS[+process.argv[2] - 1];
const W = +(process.argv[3] ?? 200);
const passes = +(process.argv[4] ?? 2);
const STEP = 10;
const sol = level.solution.map((p) => ({ ...p }));

// A candidate counts only if it wins, looks sane, and still needs every piece.
const wins = (pieces) =>
  !placementIssues(level, pieces).length &&
  runToEnd(level, pieces).result === 'win' &&
  pieces.every((_, j) => runToEnd(level, pieces.filter((__, k) => k !== j)).result === 'miss');

console.log('start:', wins(sol) ? 'WIN' : 'miss', placementIssues(level, sol).join('; '));
for (let pass = 0; pass < passes; pass++) {
  for (let i = 0; i < sol.length; i++) {
    const p0 = sol[i];
    const n = (2 * W) / STEP + 1;
    const grid = [];
    for (let iy = 0; iy < n; iy++) {
      grid.push([]);
      for (let ix = 0; ix < n; ix++) {
        const cand = { ...p0, x: p0.x - W + ix * STEP, y: p0.y - W + iy * STEP };
        grid[iy].push(wins(sol.map((q, j) => (j === i ? cand : q))));
      }
    }
    let best = null;
    for (let iy = 0; iy < n; iy++)
      for (let ix = 0; ix < n; ix++) {
        if (!grid[iy][ix]) continue;
        let score = 0;
        for (let dy = -4; dy <= 4; dy++)
          for (let dx = -4; dx <= 4; dx++) if (grid[iy + dy]?.[ix + dx]) score++;
        const dist = Math.hypot(ix - (n - 1) / 2, iy - (n - 1) / 2);
        if (!best || score > best.score || (score === best.score && dist < best.dist)) best = { ix, iy, score, dist };
      }
    if (!best) {
      console.log(`piece ${i} (${p0.type}): no winning spot within ±${W}`);
      continue;
    }
    sol[i] = { ...p0, x: p0.x - W + best.ix * STEP, y: p0.y - W + best.iy * STEP };
    const total = grid.flat().filter(Boolean).length;
    console.log(`pass ${pass} piece ${i} ${p0.type}: -> ${sol[i].x},${sol[i].y} score ${best.score}/81, ${total} winning cells`);
  }
}
const needed = sol.map((_, i) => runToEnd(level, sol.filter((__, j) => j !== i)).result === 'miss');
console.log('empty board:', runToEnd(level, []).result, '| each piece needed:', needed.join(','));
console.log('solution: [\n' + sol.map((p) => `      { type: '${p.type}', x: ${p.x}, y: ${p.y}, dir: ${p.dir} },`).join('\n') + '\n    ],');

if (process.argv.includes('--write')) {
  const file = new URL('../js/levels.js', import.meta.url);
  const src = readFileSync(file, 'utf8');
  const at = src.indexOf(`id: ${level.id},`);
  const start = src.indexOf('solution: [', at);
  const end = src.indexOf('],', start) + 2;
  const body = 'solution: [\n' + sol.map((p) => `      { type: '${p.type}', x: ${p.x}, y: ${p.y}, dir: ${p.dir} },`).join('\n') + '\n    ],';
  writeFileSync(file, src.slice(0, start) + body + src.slice(end));
  console.log(`wrote level ${level.id}`);
}
