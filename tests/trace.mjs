// Prints the ball path for a level's solution.
// Usage: node tests/trace.mjs <levelNumber> [none | without=<i>] [every=10]
import { LEVELS } from '../js/levels.js';
import { createSim, stepSim } from '../js/physics.js';
const level = LEVELS[+(process.argv[2] ?? 1) - 1];
const arg = process.argv[3] ?? '';
const every = +(process.argv[4] ?? 10);
let pieces = level.solution;
if (arg === 'none') pieces = [];
else if (arg.startsWith('without=')) pieces = level.solution.filter((_, i) => i !== +arg.slice(8));
const sim = createSim(level, pieces);
let n = 0;
while (!sim.result) {
  stepSim(sim, 1 / 60);
  const ev = sim.events.map((e) => e.type).join(',');
  sim.events.length = 0;
  if (n++ % every === 0 || ev)
    console.log(sim.t.toFixed(2), sim.ball.x | 0, sim.ball.y | 0, sim.ball.vx | 0, sim.ball.vy | 0, ev);
}
console.log(sim.result, sim.t.toFixed(2));
