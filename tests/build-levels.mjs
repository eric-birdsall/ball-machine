// Builds the generated levels from the recipes below and writes them into
// js/levels.js between the <generated> markers.
// Usage: node tests/build-levels.mjs [--write] [key ...]
//   with keys: only (re)build those and print them
import { readFileSync, writeFileSync } from 'node:fs';
import { best } from './gen.mjs';
import { RECIPES } from './recipes.mjs';

const args = process.argv.slice(2);
const write = args.includes('--write');
const only = args.filter((a) => !a.startsWith('--'));

const fmtPiece = (p) => `{ type: '${p.type}', x: ${p.x}, y: ${p.y}, dir: ${p.dir} }`;
function fmt(l) {
  const lines = ['  {', `    key: '${l.key}',`, `    ball: { x: ${l.ball.x}, y: ${l.ball.y} },`];
  lines.push(`    walls: [${l.walls.map((w) => `[${w.join(', ')}]`).join(', ')}],`);
  lines.push(`    blocks: [${l.blocks.map((b) => `[${b.join(', ')}]`).join(', ')}],`);
  lines.push(`    bucket: { x: ${l.bucket.x}, y: ${l.bucket.y} },`);
  if (l.fixed) lines.push(`    fixed: [${l.fixed.map(fmtPiece).join(', ')}],`);
  lines.push(`    tray: [${l.tray.map((s) => `{ type: '${s.type}', count: ${s.count} }`).join(', ')}],`);
  lines.push('    solution: [', ...l.solution.map((p) => `      ${fmtPiece(p)},`), '    ],', '  },');
  return lines.join('\n');
}

const out = [];
let failed = 0;
for (const group of RECIPES) {
  out.push(`  // ---- ${group.title}`);
  for (const recipe of group.levels) {
    if (only.length && !only.includes(recipe.key)) continue;
    const g = best(recipe);
    if (!g) {
      failed++;
      console.log(`✖ ${recipe.key} ${recipe.pieces.join(' + ')}: no level found`);
      continue;
    }
    console.log(`✔ ${recipe.key} ${recipe.pieces.join(' + ')}  forgiving ${(g.score * 100) | 0}%  ${g.time.toFixed(1)}s`);
    out.push(fmt(g.level));
  }
}

if (write && !failed && !only.length) {
  const file = new URL('../js/levels.js', import.meta.url);
  const src = readFileSync(file, 'utf8');
  const a = src.indexOf('  // <generated>');
  const b = src.indexOf('  // </generated>');
  const head = src.slice(0, src.indexOf('\n', a) + 1);
  writeFileSync(file, head + out.join('\n') + '\n' + src.slice(b));
  console.log(`wrote ${out.filter((l) => l.startsWith('  {')).length} generated levels`);
} else if (write) {
  console.log('not written (failures, or a partial build)');
}
