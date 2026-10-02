// Every level must be winnable with its solution, and not winnable without it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../js/levels.js';
import { runToEnd, WORLD, BALL_R, BUCKET } from '../js/physics.js';
import { PIECE_TYPES } from '../js/pieces.js';
import { placementIssues } from './lib.mjs';

test('there are 25 levels with ids 1..25', () => {
  assert.deepEqual(LEVELS.map((l) => l.id), Array.from({ length: 25 }, (_, i) => i + 1));
});

test('every piece type appears in some level', () => {
  const used = new Set(LEVELS.flatMap((l) => l.tray.map((t) => t.type)));
  for (const t of PIECE_TYPES) assert.ok(used.has(t), t);
});

for (const level of LEVELS) {
  test(`level ${level.id}: solution wins`, () => {
    assert.equal(runToEnd(level, level.solution).result, 'win');
  });

  test(`level ${level.id}: empty board misses`, () => {
    assert.equal(runToEnd(level, []).result, 'miss');
  });

  test(`level ${level.id}: every solution piece is needed`, () => {
    level.solution.forEach((_, i) => {
      const pieces = level.solution.filter((__, j) => j !== i);
      assert.equal(runToEnd(level, pieces).result, 'miss', `without piece ${i}`);
    });
  });

  test(`level ${level.id}: solution pieces don't overlap the scenery`, () => {
    assert.deepEqual(placementIssues(level, level.solution), []);
  });

  test(`level ${level.id}: tray covers the solution and fits`, () => {
    assert.ok(level.tray.length <= 4, 'at most 4 tray slots');
    const need = {};
    for (const s of level.solution) need[s.type] = (need[s.type] || 0) + 1;
    for (const [type, n] of Object.entries(need)) {
      const slot = level.tray.find((t) => t.type === type);
      assert.ok(slot && slot.count >= n, type);
    }
  });

  test(`level ${level.id}: snap spots of the same type are far apart`, () => {
    const s = level.solution;
    for (let i = 0; i < s.length; i++)
      for (let j = i + 1; j < s.length; j++)
        if (s[i].type === s[j].type) assert.ok(Math.hypot(s[i].x - s[j].x, s[i].y - s[j].y) > 220);
  });

  test(`level ${level.id}: ball start and bucket are clear of blocks`, () => {
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
