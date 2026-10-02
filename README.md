# Ball Machine

A mobile-first, Incredible Machine–style physics puzzle for ages 4–6.
Drag pieces from the tray, tap a piece to flip it, press the big green button,
and help the ball into the bucket. The kids' screens have no text, so
pre-readers can play.

## For grown-ups: the main menu

- **Level Count:** choose how many levels (1–25) your child can play. After
  that many wins they see an "All done!" screen.
- **Time Count:** choose a time limit (5–60 minutes). When time runs out
  mid-level, they get to finish that level first. The clock only runs while the
  game is open.
- **Freeplay:** no limits. It's unlocked by answering a simple multiplication
  question.

Leaving an active Level/Time session (the house button on the level screen), or
leaving the "All done!" screen, also asks the math question, so a limit can't
simply be restarted. Sessions are saved on the device and survive a reload.

## What's in it

- **25 levels in 5 worlds.** Each world has its own sky: day, meadow, sunset,
  night, candy.
  1. Ramp, trampoline, conveyor, fan
  2. Funnel, bumper
  3. Slide, magnet
  4. Cannon, portal
  5. Longer machines with 3–4 pieces, plus a spare piece that isn't needed
- **10 kinds of piece:** ramp, trampoline, fan, conveyor, bumper, magnet,
  cannon, funnel, slide and portal. Pieces that point a way (ramp, fan,
  conveyor, cannon, slide) flip when tapped.
- **Kid-friendly help:**
  - Pieces snap onto the right spot when dropped nearby.
  - Level 1 has an animated tutorial hand.
  - After 2 misses, ghost pieces and a hand show where things go.
- **All art and sound are generated in code.** There are no asset files besides
  the app icons.
- **Installable PWA:** "Add to Home Screen" runs it fullscreen in landscape and
  works offline.

## Run it

ES modules need a web server (opening `index.html` directly won't work):

```bash
npm start
```

Then open http://localhost:8080. To try it on a phone, use your computer's LAN
IP on the same Wi-Fi.

## Test

```bash
npm test
```

The tests run every level headlessly and check that:

- the solution wins
- the empty board misses
- every solution piece is needed
- no piece overlaps the scenery

They also cover the Level/Time/Freeplay session rules.

## Project layout

| File | What it does |
| --- | --- |
| `js/levels.js` | Level data. Each level lists its `solution`, which drives snapping, hints and tests. Tray entries not in the solution are decoys. |
| `js/physics.js` | Small one-ball physics sim, pure JS so it runs in Node. |
| `js/pieces.js` | Piece sizes, collision shapes and trigger zones (wind, magnet, cannon, portal). |
| `js/session.js` | Level Count / Time Count / Freeplay rules and the math question. |
| `js/menu.js` | Grown-up screens (HTML over the canvas). |
| `js/render.js` | All canvas drawing and the UI layout (1920×1080 logical space). |
| `js/audio.js` | WebAudio sound effects and background music. |
| `js/main.js` | Game states, touch input, tutorial and hints, and saved progress. |

## Level design tools

```bash
node tests/check.mjs
```

This prints each level's status. For level 12, for example:

```bash
node tests/check.mjs 12
```

Print the ball's path for a level, optionally with one solution piece removed:

```bash
node tests/trace.mjs 12 without=0
```

Move each solution piece to its most forgiving winning spot (every piece stays
needed and nothing overlaps). `--write` updates `js/levels.js`:

```bash
node tests/autotune.mjs 12 200 2 --write
```

A few rules of thumb:

- A cannon shot travels about 935 px sideways, so put cannons near one edge.
- Portals pair up in order: fixed portals first, then placed ones.
- Magnets pull sideways only.
