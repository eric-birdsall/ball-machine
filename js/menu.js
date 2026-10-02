// Grown-up facing screens (main menu, pickers, math gate, "all done").
// Built as HTML over the canvas: these are read by parents, so text is fine.
import { LEVEL_CHOICES, TIME_CHOICES, makeMathQuestion } from './session.js';

export function createMenus(root, handlers) {
  let screen = null;

  function show(html, name) {
    root.innerHTML = `<div class="panel ${name}">${html}</div>`;
    root.hidden = false;
    screen = name;
    root.querySelectorAll('[data-act]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        handlers.tap?.();
        actions[el.dataset.act]?.(el);
      });
    });
  }

  function hide() {
    root.hidden = true;
    root.innerHTML = '';
    screen = null;
  }

  let actions = {};

  function home() {
    actions = {
      levels: () => picker('levels'),
      time: () => picker('time'),
      free: () => gate(() => handlers.startFree(), home),
    };
    show(
      `<h1 class="title">Ball Machine</h1>
      <div class="cards">
        <button class="card c1" data-act="levels">
          <span class="icon">⭐</span><span class="label">Level Count</span>
          <span class="sub">Play a set number of levels</span>
        </button>
        <button class="card c2" data-act="time">
          <span class="icon">⏰</span><span class="label">Time Count</span>
          <span class="sub">Play for a set time</span>
        </button>
        <button class="card c3" data-act="free">
          <span class="icon">🔒</span><span class="label">Freeplay</span>
          <span class="sub">Grown-up unlock, no limits</span>
        </button>
      </div>`,
      'home',
    );
  }

  function picker(kind) {
    const cfg = kind === 'levels' ? LEVEL_CHOICES : TIME_CHOICES;
    let value = handlers.lastChoice?.(kind) ?? cfg.initial;
    const fmt = (v) => (kind === 'levels' ? `${v} ${v === 1 ? 'level' : 'levels'}` : `${v} minutes`);
    actions = {
      minus: () => set(value - cfg.step),
      plus: () => set(value + cfg.step),
      start: () => (kind === 'levels' ? handlers.startLevels(value) : handlers.startTime(value)),
      back: home,
    };
    show(
      `<h2>${kind === 'levels' ? '⭐ Level Count' : '⏰ Time Count'}</h2>
      <p class="hint">${
        kind === 'levels'
          ? 'How many levels can they play?'
          : 'How long can they play? If time runs out mid-level, they get to finish it.'
      }</p>
      <div class="stepper">
        <button class="round" data-act="minus" aria-label="Less">−</button>
        <output class="value">${fmt(value)}</output>
        <button class="round" data-act="plus" aria-label="More">+</button>
      </div>
      <div class="row">
        <button class="btn ghost" data-act="back">Back</button>
        <button class="btn go" data-act="start">Start ▶</button>
      </div>`,
      'picker',
    );
    function set(v) {
      value = Math.min(cfg.max, Math.max(cfg.min, v));
      root.querySelector('.value').textContent = fmt(value);
    }
  }

  // A math question keeps little ones out of grown-up controls.
  function gate(onPass, onCancel) {
    let q = makeMathQuestion();
    let entry = '';
    let fails = 0;
    actions = {
      key: (el) => {
        if (entry.length < 3) entry += el.dataset.key;
        render();
      },
      del: () => {
        entry = entry.slice(0, -1);
        render();
      },
      ok: () => {
        if (+entry === q.answer && entry !== '') {
          onPass();
          return;
        }
        fails++;
        entry = '';
        const panel = root.querySelector('.panel');
        panel.classList.remove('shake');
        void panel.offsetWidth;
        panel.classList.add('shake');
        if (fails >= 3) {
          fails = 0;
          q = makeMathQuestion();
          root.querySelector('.q').textContent = `${q.text} = ?`;
        }
        render();
      },
      cancel: onCancel,
    };
    const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => `<button class="key" data-act="key" data-key="${k}">${k}</button>`).join('');
    show(
      `<h2>🔒 Grown-ups only</h2>
      <p class="q">${q.text} = ?</p>
      <output class="entry">&nbsp;</output>
      <div class="keypad">${keys}
        <button class="key" data-act="del" aria-label="Delete">⌫</button>
        <button class="key" data-act="key" data-key="0">0</button>
        <button class="key ok" data-act="ok">OK</button>
      </div>
      <button class="btn ghost" data-act="cancel">Cancel</button>`,
      'gate',
    );
    function render() {
      root.querySelector('.entry').innerHTML = entry || '&nbsp;';
    }
  }

  function done() {
    actions = { grownup: () => gate(() => handlers.endSession(), done) };
    show(
      `<div class="trophy">🏆</div>
      <h1 class="title">All done!</h1>
      <p class="hint">Great job! Time for a break.</p>
      <button class="btn ghost small" data-act="grownup">🔒 Grown-ups</button>`,
      'done',
    );
  }

  return { home, done, gate, hide, get screen() { return screen; } };
}
