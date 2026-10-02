// All sound is synthesised with WebAudio: no audio files to load.
let ctx = null;
let master, sfxBus, musicBus;
let musicOn = true;
let musicTimer = null;
let nextNoteTime = 0;
let step = 0;
let noiseBuf = null;

export function initAudio(startWithMusic) {
  musicOn = startWithMusic;
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);
  sfxBus = ctx.createGain();
  sfxBus.gain.value = 0.8;
  sfxBus.connect(master);
  musicBus = ctx.createGain();
  musicBus.gain.value = musicOn ? 0.35 : 0;
  musicBus.connect(master);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  startMusic();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) ctx.suspend();
    else ctx.resume();
  });
}

export function setMusic(on) {
  musicOn = on;
  if (!ctx) return;
  musicBus.gain.cancelScheduledValues(ctx.currentTime);
  musicBus.gain.setTargetAtTime(on ? 0.35 : 0, ctx.currentTime, 0.1);
}

function tone(freq, t, dur, { type = 'sine', vol = 0.3, to = null, bus = sfxBus, attack = 0.005 } = {}) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(bus);
  o.start(t);
  o.stop(t + dur + 0.05);
  return o;
}

function noise(t, dur, { vol = 0.3, freq = 1200, to = null, q = 1, bus = sfxBus } = {}) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.setValueAtTime(freq, t);
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(bus);
  src.start(t);
  src.stop(t + dur + 0.05);
}

const lastPlayed = {};

export function sfx(name, strength = 1) {
  if (!ctx || ctx.state !== 'running') return;
  const t = ctx.currentTime;
  // Throttle rapid repeats of the same sound.
  if (lastPlayed[name] && t - lastPlayed[name] < 0.07) return;
  lastPlayed[name] = t;
  switch (name) {
    case 'tap':
      tone(660, t, 0.08, { type: 'triangle', vol: 0.25 });
      break;
    case 'pick':
      tone(440, t, 0.12, { vol: 0.3, to: 880 });
      break;
    case 'drop':
      tone(200, t, 0.14, { vol: 0.45, to: 90 });
      tone(900, t, 0.04, { type: 'triangle', vol: 0.12 });
      break;
    case 'snap':
      tone(200, t, 0.12, { vol: 0.4, to: 100 });
      tone(1046, t + 0.03, 0.12, { type: 'triangle', vol: 0.18 });
      tone(1568, t + 0.09, 0.18, { type: 'triangle', vol: 0.15 });
      break;
    case 'flip':
      tone(520, t, 0.06, { type: 'square', vol: 0.08 });
      tone(780, t + 0.06, 0.08, { type: 'square', vol: 0.08 });
      break;
    case 'return':
      tone(700, t, 0.15, { vol: 0.25, to: 300 });
      break;
    case 'go':
      noise(t, 0.4, { vol: 0.25, freq: 400, to: 3000, q: 2 });
      tone(523, t + 0.05, 0.15, { type: 'triangle', vol: 0.25 });
      tone(784, t + 0.15, 0.25, { type: 'triangle', vol: 0.25 });
      break;
    case 'stop':
      tone(500, t, 0.15, { type: 'triangle', vol: 0.2, to: 300 });
      break;
    case 'boing': {
      const o = tone(180, t, 0.45, { vol: 0.45 });
      o.frequency.linearRampToValueAtTime(520, t + 0.08);
      o.frequency.linearRampToValueAtTime(300, t + 0.2);
      o.frequency.linearRampToValueAtTime(420, t + 0.3);
      break;
    }
    case 'hit': {
      const v = Math.min(1, strength);
      tone(260 + Math.random() * 60, t, 0.09, { type: 'triangle', vol: 0.1 + 0.3 * v, to: 120 });
      noise(t, 0.05, { vol: 0.08 + 0.15 * v, freq: 1800 });
      break;
    }
    case 'clank':
      tone(900, t, 0.25, { type: 'square', vol: 0.06, to: 700 });
      tone(1350, t, 0.2, { type: 'triangle', vol: 0.1 });
      break;
    case 'win': {
      const notes = [523, 659, 784, 1046, 784, 1046, 1318];
      notes.forEach((f, i) => tone(f, t + i * 0.1, 0.3, { type: 'triangle', vol: 0.3 }));
      for (let i = 0; i < 8; i++) tone(2000 + Math.random() * 2000, t + 0.7 + i * 0.06, 0.12, { vol: 0.06 });
      break;
    }
    case 'miss':
      noise(t, 0.35, { vol: 0.35, freq: 800, to: 200 });
      tone(392, t + 0.1, 0.25, { type: 'triangle', vol: 0.18, to: 330 });
      tone(330, t + 0.35, 0.35, { type: 'triangle', vol: 0.18, to: 262 });
      break;
    case 'pop':
      tone(300, t, 0.1, { vol: 0.3, to: 700 });
      break;
    case 'bump':
      tone(880, t, 0.12, { type: 'square', vol: 0.1, to: 1320 });
      tone(1320, t + 0.05, 0.15, { type: 'triangle', vol: 0.18 });
      break;
    case 'load':
      tone(160, t, 0.18, { vol: 0.4, to: 80 });
      break;
    case 'boom':
      noise(t, 0.5, { vol: 0.5, freq: 300, to: 80, q: 0.7 });
      tone(120, t, 0.35, { vol: 0.45, to: 50 });
      break;
    case 'warp': {
      const o = tone(300, t, 0.4, { vol: 0.25, to: 1800 });
      o.type = 'sine';
      tone(1800, t + 0.15, 0.3, { type: 'triangle', vol: 0.1, to: 600 });
      break;
    }
    case 'wobble': {
      const o = tone(240, t, 0.3, { vol: 0.35 });
      o.frequency.linearRampToValueAtTime(420, t + 0.07);
      o.frequency.linearRampToValueAtTime(260, t + 0.18);
      break;
    }
    case 'punch':
      noise(t, 0.12, { vol: 0.45, freq: 900, to: 300, q: 0.8 });
      tone(180, t, 0.16, { vol: 0.45, to: 70 });
      break;
    case 'pipeOut':
      tone(260, t, 0.2, { type: 'square', vol: 0.1, to: 620 });
      tone(620, t + 0.08, 0.14, { type: 'triangle', vol: 0.18, to: 880 });
      break;
    case 'grab':
      tone(520, t, 0.25, { type: 'triangle', vol: 0.2, to: 1040 });
      break;
    case 'balloonPop':
      noise(t, 0.09, { vol: 0.5, freq: 2400, q: 0.6 });
      tone(900, t, 0.08, { type: 'square', vol: 0.12, to: 300 });
      break;
    case 'unlock':
      [784, 988, 1175, 1568].forEach((f, i) => tone(f, t + i * 0.07, 0.2, { type: 'triangle', vol: 0.2 }));
      break;
  }
}

// ---- Background music: a gentle, bouncy pentatonic loop ----
const BPM = 104;
const E = 60 / BPM / 2; // eighth note
const n = (s) => (s == null ? null : 261.63 * Math.pow(2, s / 12));
// Semitones from middle C; null = rest. 32 eighth notes = 4 bars.
const MELODY = [
  7, null, 9, 7, 4, null, 2, null, 4, 7, null, 9, 12, null, null, null,
  9, null, 7, 9, 12, null, 9, 7, 4, null, 2, 4, 0, null, null, null,
  7, null, 9, 7, 4, null, 2, null, 4, 7, null, 9, 12, null, 14, null,
  12, null, 9, 7, 9, null, 7, 4, 2, null, 4, 2, 0, null, null, null,
];
const BASS = [-12, -5, -8, -5, -15, -8, -12, -5, -12, -5, -8, -5, -10, -3, -12, -12];

function startMusic() {
  nextNoteTime = ctx.currentTime + 0.2;
  step = 0;
  clearInterval(musicTimer);
  musicTimer = setInterval(scheduleMusic, 50);
}

function scheduleMusic() {
  if (!ctx || ctx.state !== 'running') return;
  while (nextNoteTime < ctx.currentTime + 0.25) {
    const m = MELODY[step % MELODY.length];
    if (m != null) tone(n(m), nextNoteTime, E * 1.6, { type: 'triangle', vol: 0.12, bus: musicBus, attack: 0.01 });
    if (step % 4 === 0) {
      const b = BASS[(step / 4) % BASS.length];
      tone(n(b), nextNoteTime, E * 3.2, { type: 'sine', vol: 0.18, bus: musicBus, attack: 0.02 });
    }
    if (step % 2 === 1) noise(nextNoteTime, 0.03, { vol: 0.05, freq: 7000, bus: musicBus });
    nextNoteTime += E;
    step++;
  }
}
