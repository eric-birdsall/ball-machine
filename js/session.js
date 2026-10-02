// Play sessions chosen by a grown-up on the main menu. Pure logic (no DOM).
//   levels: play `limit` levels (counted by wins), then the session is over
//   time:   play for `limit` seconds; when time runs out mid-level the child
//           finishes that level first
//   free:   no limits (unlocked with a math question)

export const LEVEL_CHOICES = { min: 1, max: 25, step: 1, initial: 3 };
export const TIME_CHOICES = { min: 5, max: 60, step: 5, initial: 15 }; // minutes

export function newSession(mode, limit = 0) {
  return {
    mode,
    limit: mode === 'time' ? limit * 60 : limit,
    completed: 0,
    timeLeft: mode === 'time' ? limit * 60 : 0,
    over: false,
  };
}

export function timeUp(s) {
  return s.mode === 'time' && s.timeLeft <= 0;
}

// Advance the clock. `midLevel` is true while a level is being played and not
// yet won; running out of time then only flags the session so the child can
// finish. Otherwise running out ends it.
export function tickSession(s, dt, midLevel) {
  if (!s || s.over || s.mode !== 'time') return;
  s.timeLeft = Math.max(0, s.timeLeft - dt);
  if (s.timeLeft <= 0 && !midLevel) s.over = true;
}

export function levelWon(s) {
  if (!s || s.over) return;
  s.completed++;
  if (s.mode === 'levels' && s.completed >= s.limit) s.over = true;
  if (timeUp(s)) s.over = true;
}

// A simple question grown-ups can answer and pre-readers can't.
export function makeMathQuestion(rand = Math.random) {
  const a = 3 + Math.floor(rand() * 7); // 3..9
  const b = 4 + Math.floor(rand() * 6); // 4..9
  return { text: `${a} × ${b}`, answer: a * b };
}
