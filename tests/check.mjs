// Quick status of every level (or one): solution result, empty board,
// whether each piece is needed, and placement problems.
// Usage: node tests/check.mjs [levelNumber]
import { LEVELS } from '../js/levels.js';
import { runToEnd } from '../js/physics.js';
import { placementIssues } from './lib.mjs';

const only = process.argv[2] ? [+process.argv[2] - 1] : LEVELS.map((_, i) => i);
for (const i of only) {
  const L = LEVELS[i];
  const sol = runToEnd(L, L.solution);
  const empty = runToEnd(L, []).result;
  const needed = L.solution.map((_, k) => runToEnd(L, L.solution.filter((__, j) => j !== k)).result === 'miss');
  const issues = placementIssues(L, L.solution);
  const ok = sol.result === 'win' && empty === 'miss' && needed.every(Boolean) && !issues.length;
  console.log(
    `${ok ? '✔' : '✖'} L${i + 1} solution:${sol.result}(${sol.t.toFixed(1)}s) empty:${empty} needed:${needed.map((n) => (n ? 'y' : 'N')).join('')}`,
    issues.length ? `issues: ${issues.join('; ')}` : '',
  );
}
