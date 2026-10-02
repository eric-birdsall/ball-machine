import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newSession, tickSession, levelWon, makeMathQuestion } from '../js/session.js';

test('level count ends after the chosen number of wins', () => {
  const s = newSession('levels', 3);
  levelWon(s);
  levelWon(s);
  assert.equal(s.over, false);
  levelWon(s);
  assert.equal(s.over, true);
});

test('time count ends when time runs out between levels', () => {
  const s = newSession('time', 5);
  tickSession(s, 299, false);
  assert.equal(s.over, false);
  tickSession(s, 2, false);
  assert.equal(s.over, true);
});

test('time count lets the child finish the level they are on', () => {
  const s = newSession('time', 5);
  tickSession(s, 400, true); // time runs out mid-level
  assert.equal(s.timeLeft, 0);
  assert.equal(s.over, false);
  tickSession(s, 60, true); // still playing that level
  assert.equal(s.over, false);
  levelWon(s); // finished it: now we're done
  assert.equal(s.over, true);
});

test('freeplay never ends', () => {
  const s = newSession('free');
  tickSession(s, 1e6, false);
  for (let i = 0; i < 100; i++) levelWon(s);
  assert.equal(s.over, false);
});

test('math questions are simple products', () => {
  for (let i = 0; i < 50; i++) {
    const q = makeMathQuestion();
    const [a, b] = q.text.split(' × ').map(Number);
    assert.equal(a * b, q.answer);
    assert.ok(a >= 3 && a <= 9 && b >= 4 && b <= 9);
  }
});
