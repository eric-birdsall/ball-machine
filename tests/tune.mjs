// Level tuning helper: sweeps one piece's position and prints a win map.
// Usage: node tests/tune.mjs <levelNumber> <pieceIndex> [step]
import { LEVELS } from '../js/levels.js';
import { runToEnd } from '../js/physics.js';

const li = +(process.argv[2] ?? 1) - 1;
const pi = +(process.argv[3] ?? 0);
const step = +(process.argv[4] ?? 20);
const level = LEVELS[li];
const base = level.solution.map((p) => ({ ...p }));

const trace = runToEnd(level, base);
console.log(`solution as written: ${trace.result} at t=${trace.t.toFixed(2)} ball=(${trace.ball.x | 0},${trace.ball.y | 0})`);
console.log(`no pieces: ${runToEnd(level, []).result}`);
for (let i = 0; i < base.length; i++) {
  console.log(`without piece ${i}: ${runToEnd(level, base.filter((_, j) => j !== i)).result}`);
}

const target = base[pi];
const rows = [];
for (let dy = -120; dy <= 120; dy += step) {
  let row = `${String(target.y + dy).padStart(5)} `;
  for (let dx = -160; dx <= 160; dx += step) {
    const pieces = base.map((p, j) => (j === pi ? { ...p, x: target.x + dx, y: target.y + dy } : p));
    const r = runToEnd(level, pieces).result;
    row += dx === 0 && dy === 0 ? (r === 'win' ? '@' : 'x') : r === 'win' ? '#' : '.';
  }
  rows.push(row);
}
console.log(`x from ${target.x - 160} to ${target.x + 160} step ${step}`);
console.log(rows.join('\n'));
