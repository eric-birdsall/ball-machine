# Ball Machine

A mobile-first, Incredible Machine–style physics puzzle for ages 4–6.
Drag pieces from the tray, tap a piece to flip it, press the big green button,
and help the ball into the bucket. The kids' screens have no text, so
pre-readers can play.

## What's in it

- **Levels in worlds of 10, all unlocked from the start.** Finished levels get
  a star. Each world has its own sky. The game is growing toward 100 levels.
- **20 kinds of piece:**
  - ramp, trampoline, fan, conveyor, bumper, magnet, cannon, funnel, slide, portal
  - plank, brick block, jelly cube, boxing glove, elbow pipe, escalator, blower,
    cloud, balloon, pinwheel spinner

  Pieces that point a way flip when tapped.
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

## Project layout

| File | What it does |
| --- | --- |
| `js/levels.js` | Level data, in play order. Each level has a stable `key` (saved stars use it) and a `solution`, which drives snapping, hints and tests. Tray entries not in the solution are decoys. |
| `js/physics.js` | Small one-ball physics sim, pure JS so it runs in Node. |
| `js/pieces.js` | Piece sizes, collision shapes and trigger zones (wind, magnet, cannon, portal). |
| `js/render.js` | All canvas drawing and the UI layout (1920×1080 logical space). |
| `js/audio.js` | WebAudio sound effects and background music. |
| `js/main.js` | Game states, touch input, tutorial and hints, and saved progress. |

## Level design tools

The first 20 levels and the last 5 are hand-made. The rest are built by a
generator from short recipes.

**Generated levels.** `tests/recipes.mjs` lists, for each level, which pieces
the ball meets and in what order. The generator (`tests/gen.mjs`) follows the
ball, places each piece on its path, puts the bucket where the ball comes down,
adds scenery, and keeps only levels that pass every check. To rebuild them into
`js/levels.js`:

```bash
node tests/build-levels.mjs --write
```

To try one recipe and see why it fails:

```bash
GEN_DEBUG=1 node tests/build-levels.mjs g31
```

Never rename or reuse a level `key`: saved stars depend on it.

**Hand-made levels.** Print each level's status:

```bash
node tests/check.mjs
```

Print the ball's path for a level, optionally with one solution piece removed:

```bash
node tests/trace.mjs 12 without=0
```

Move each solution piece to its most forgiving winning spot (`--write` updates
`js/levels.js`):

```bash
node tests/autotune.mjs 12 200 2 --write
```

A few rules of thumb:

- A cannon shot travels about 935 px sideways, so put cannons near one edge.
- Portals pair up in order: fixed portals first, then placed ones.
- Magnets pull sideways only.
