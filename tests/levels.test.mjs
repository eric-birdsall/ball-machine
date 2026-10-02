// Every level must be winnable with its solution, and not winnable without it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../js/levels.js';
import { runToEnd, WORLD, BALL_R, BUCKET } from '../js/physics.js';
import { PIECE_TYPES } from '../js/pieces.js';
import { placementIssues } from './lib.mjs';

test('every level has a unique key', () => {
  const keys = LEVELS.map((l) => l.key);
  assert.ok(keys.every((k) => typeof k === 'string' && k.length > 0));
  assert.equal(new Set(keys).size, keys.length);
});

test('the original 25 levels keep their keys (saved stars depend on them)', () => {
  for (let i = 1; i <= 25; i++) assert.ok(LEVELS.some((l) => l.key === `a${String(i).padStart(2, '0')}`));
});

// Pieces that exist in the engine but don't have levels yet (arriving in the next batch).
const PENDING = [];

test('every piece type appears in some level', () => {
  const used = new Set(LEVELS.flatMap((l) => l.tray.map((t) => t.type)));
  for (const t of PIECE_TYPES) if (!PENDING.includes(t)) assert.ok(used.has(t), t);
});

for (const [index, level] of LEVELS.entries()) {
  const name = `level ${index + 1} (${level.key})`;
  test(`${name}: solution wins`, () => {
    assert.equal(runToEnd(level, level.solution).result, 'win');
  });

  test(`${name}: empty board misses`, () => {
    assert.equal(runToEnd(level, []).result, 'miss');
  });

  test(`${name}: every solution piece is needed`, () => {
    level.solution.forEach((_, i) => {
      const pieces = level.solution.filter((__, j) => j !== i);
      assert.equal(runToEnd(level, pieces).result, 'miss', `without piece ${i}`);
    });
  });

  test(`${name}: solution pieces don't overlap the scenery`, () => {
    assert.deepEqual(placementIssues(level, level.solution), []);
  });

  test(`${name}: tray covers the solution and fits`, () => {
    assert.ok(level.tray.length <= 4, 'at most 4 tray slots');
    const need = {};
    for (const s of level.solution) need[s.type] = (need[s.type] || 0) + 1;
    for (const [type, n] of Object.entries(need)) {
      const slot = level.tray.find((t) => t.type === type);
      assert.ok(slot && slot.count >= n, type);
    }
  });

  test(`${name}: snap spots of the same type are far apart`, () => {
    const s = level.solution;
    for (let i = 0; i < s.length; i++)
      for (let j = i + 1; j < s.length; j++)
        if (s[i].type === s[j].type) assert.ok(Math.hypot(s[i].x - s[j].x, s[i].y - s[j].y) > 220);
  });

  test(`${name}: ball start and bucket are clear of blocks`, () => {
    const hw = BUCKET.w / 2;
    for (const [x, y, w, h] of level.blocks || []) {
      const b = level.ball;
      const inX = b.x + BALL_R > x && b.x - BALL_R < x + w;
      assert.ok(!(inX && b.y + BALL_R > y && b.y - BALL_R < y + h), 'ball start inside a block');
      const bk = level.bucket;
      const overlap = bk.x + hw > x + 2 && bk.x - hw < x + w - 2 && bk.y > y + 2 && bk.y - BUCKET.h < y + h - 2;
      assert.ok(!overlap, 'bucket overlaps a block');
    }
    assert.ok(level.bucket.y <= WORLD.FLOOR);
  });
}
