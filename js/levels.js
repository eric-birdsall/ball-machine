// Level definitions. World is 1600 x 1080 with the ground top at y = 1040.
//   ball:     where the ball starts (it drops out of a pipe)
//   walls:    [ax, ay, bx, by, radius] wooden beams
//   blocks:   [x, y, w, h] brick blocks
//   bucket:   { x, y } bottom-centre of the bucket
//   fixed:    pieces already in the level that can't be moved
//   tray:     pieces the child gets to place
//   solution: where tray pieces go; used for snapping, hints and tests
//   tutorial: show the animated "drag this here" hand

export const LEVELS = [
  {
    id: 1,
    ball: { x: 200, y: 170 },
    walls: [
      [90, 300, 560, 410, 12],
      [710, 200, 710, 540, 14],
    ],
    blocks: [
      [820, 760, 330, 280],
      [1150, 930, 220, 110],
      [1380, 560, 44, 480],
    ],
    bucket: { x: 1260, y: 930 },
    tray: [{ type: 'ramp', count: 1 }],
    solution: [{ type: 'ramp', x: 730, y: 690, dir: 1 }],
    tutorial: true,
  },
  {
    id: 2,
    ball: { x: 160, y: 150 },
    walls: [[70, 260, 430, 340, 12]],
    blocks: [
      [960, 640, 140, 400],
      [1510, 560, 44, 480],
    ],
    bucket: { x: 1390, y: 1040 },
    tray: [{ type: 'tramp', count: 1 }],
    solution: [{ type: 'tramp', x: 790, y: 1005, dir: 1 }],
  },
  // ---- World 1: ramps, trampolines, conveyors, fans
  {
    id: 3,
    ball: { x: 300, y: 150 },
    walls: [[780, 300, 780, 760, 14]],
    blocks: [],
    bucket: { x: 470, y: 1040 },
    tray: [{ type: 'ramp', count: 2 }],
    solution: [
      { type: 'ramp', x: 320, y: 460, dir: 1 },
      { type: 'ramp', x: 630, y: 760, dir: -1 },
    ],
  },
  {
    id: 4,
    ball: { x: 250, y: 150 },
    walls: [],
    blocks: [[580, 700, 110, 340], [1080, 560, 44, 480]],
    bucket: { x: 900, y: 1040 },
    tray: [{ type: 'conveyor', count: 1 }],
    solution: [{ type: 'conveyor', x: 340, y: 650, dir: 1 }],
  },
  {
    id: 5,
    ball: { x: 260, y: 140 },
    walls: [],
    blocks: [
      [1180, 880, 260, 160],
      [1450, 420, 44, 620],
    ],
    bucket: { x: 1310, y: 880 },
    tray: [
      { type: 'conveyor', count: 1 },
      { type: 'fan', count: 1 },
    ],
    solution: [
      { type: 'conveyor', x: 330, y: 330, dir: 1 },
      { type: 'fan', x: 760, y: 570, dir: 1 },
    ],
  },
  // ---- World 2: funnels and bumpers
  {
    id: 6,
    ball: { x: 160, y: 150 },
    walls: [[60, 270, 520, 380, 12]],
    blocks: [],
    bucket: { x: 700, y: 1040 },
    tray: [{ type: 'funnel', count: 1 }],
    solution: [{ type: 'funnel', x: 700, y: 600, dir: 1 }],
  },
  {
    id: 7,
    ball: { x: 400, y: 150 },
    walls: [],
    blocks: [[620, 560, 100, 480], [1300, 600, 44, 440]],
    bucket: { x: 1050, y: 1040 },
    tray: [{ type: 'bumper', count: 1 }],
    solution: [{ type: 'bumper', x: 360, y: 470, dir: 1 }],
  },
  {
    id: 8,
    ball: { x: 250, y: 150 },
    walls: [],
    blocks: [[1150, 600, 320, 440]],
    bucket: { x: 1340, y: 600 },
    tray: [
      { type: 'ramp', count: 1 },
      { type: 'tramp', count: 1 },
    ],
    solution: [
      { type: 'ramp', x: 330, y: 450, dir: 1 },
      { type: 'tramp', x: 800, y: 1005, dir: 1 },
    ],
  },
  {
    id: 9,
    ball: { x: 160, y: 150 },
    walls: [[60, 270, 520, 380, 12]],
    blocks: [],
    bucket: { x: 300, y: 1040 },
    tray: [
      { type: 'funnel', count: 1 },
      { type: 'conveyor', count: 1 },
    ],
    solution: [
      { type: 'funnel', x: 720, y: 560, dir: 1 },
      { type: 'conveyor', x: 660, y: 820, dir: -1 },
    ],
  },
  {
    id: 10,
    ball: { x: 250, y: 150 },
    walls: [],
    blocks: [[880, 560, 90, 480], [1400, 600, 44, 440]],
    bucket: { x: 1180, y: 1040 },
    tray: [
      { type: 'ramp', count: 1 },
      { type: 'bumper', count: 1 },
    ],
    solution: [
      { type: 'ramp', x: 340, y: 500, dir: 1 },
      { type: 'bumper', x: 730, y: 820, dir: 1 },
    ],
  },
  // ---- World 3: slides and magnets
  {
    id: 11,
    ball: { x: 300, y: 150 },
    walls: [],
    blocks: [[700, 700, 120, 340], [1450, 500, 44, 540]],
    bucket: { x: 1250, y: 1040 },
    tray: [{ type: 'slide', count: 1 }],
    solution: [{ type: 'slide', x: 330, y: 500, dir: 1 }],
  },
  {
    id: 12,
    ball: { x: 200, y: 150 },
    walls: [[100, 330, 470, 410, 12]],
    blocks: [],
    bucket: { x: 1060, y: 1040 },
    tray: [{ type: 'magnet', count: 1 }],
    solution: [
      { type: 'magnet', x: 900, y: 450, dir: 1 },
    ],
  },
  {
    id: 13,
    ball: { x: 250, y: 150 },
    walls: [],
    blocks: [[900, 450, 100, 590], [1150, 700, 300, 340]],
    bucket: { x: 1300, y: 700 },
    tray: [
      { type: 'slide', count: 1 },
      { type: 'tramp', count: 1 },
    ],
    solution: [
      { type: 'slide', x: 220, y: 400, dir: 1 },
      { type: 'tramp', x: 630, y: 750, dir: 1 },
    ],
  },
    {
    id: 14,
    ball: { x: 200, y: 150 },
    walls: [[80, 640, 480, 700, 12]],
    blocks: [[1330, 640, 44, 400]],
    bucket: { x: 1150, y: 1040 },
    tray: [
      { type: 'conveyor', count: 1 },
      { type: 'magnet', count: 1 },
    ],
    solution: [
      { type: 'conveyor', x: 660, y: 840, dir: 1 },
      { type: 'magnet', x: 860, y: 660, dir: 1 },
    ],
  },
  {
    id: 15,
    ball: { x: 800, y: 150 },
    walls: [],
    blocks: [[0, 830, 900, 210], [1470, 560, 44, 480]],
    bucket: { x: 1350, y: 1040 },
    tray: [
      { type: 'ramp', count: 1 },
      { type: 'slide', count: 1 },
      { type: 'magnet', count: 1 },
    ],
    solution: [
      { type: 'ramp', x: 710, y: 370, dir: -1 },
      { type: 'slide', x: 320, y: 665, dir: 1 },
      { type: 'magnet', x: 1050, y: 880, dir: 1 },
    ],
  },
  // ---- World 4: cannons and portals
  {
    id: 16,
    ball: { x: 300, y: 150 },
    walls: [],
    blocks: [[700, 700, 100, 340], [1400, 600, 44, 440]],
    bucket: { x: 1180, y: 1040 },
    tray: [{ type: 'cannon', count: 1 }],
    solution: [
      { type: 'cannon', x: 270, y: 940, dir: 1 },
    ],
  },
  {
    id: 17,
    ball: { x: 300, y: 150 },
    walls: [],
    blocks: [[700, 250, 100, 790]],
    bucket: { x: 1250, y: 1040 },
    fixed: [{ type: 'portal', x: 1250, y: 450, dir: 1 }],
    tray: [{ type: 'portal', count: 1 }],
    solution: [{ type: 'portal', x: 300, y: 650, dir: 1 }],
  },
  {
    id: 18,
    ball: { x: 700, y: 150 },
    walls: [],
    blocks: [[560, 600, 90, 440]],
    bucket: { x: 280, y: 1040 },
    tray: [
      { type: 'ramp', count: 1 },
      { type: 'cannon', count: 1 },
    ],
    solution: [
      { type: 'ramp', x: 760, y: 410, dir: 1 },
      { type: 'cannon', x: 1240, y: 880, dir: -1 },
    ],
  },
  {
    id: 19,
    ball: { x: 250, y: 150 },
    walls: [],
    blocks: [[560, 300, 90, 740], [1520, 600, 44, 440]],
    bucket: { x: 1380, y: 1040 },
    fixed: [{ type: 'portal', x: 950, y: 330, dir: 1 }],
    tray: [
      { type: 'portal', count: 1 },
      { type: 'conveyor', count: 1 },
    ],
    solution: [
      { type: 'portal', x: 250, y: 600, dir: 1 },
      { type: 'conveyor', x: 1000, y: 600, dir: 1 },
    ],
  },
  {
    id: 20,
    ball: { x: 250, y: 150 },
    walls: [],
    blocks: [[800, 560, 90, 480]],
    bucket: { x: 450, y: 1040 },
    fixed: [{ type: 'portal', x: 1300, y: 300, dir: 1 }],
    tray: [
      { type: 'portal', count: 1 },
      { type: 'cannon', count: 1 },
    ],
    solution: [
      { type: 'portal', x: 250, y: 650, dir: 1 },
      { type: 'cannon', x: 1350, y: 910, dir: -1 },
    ],
  },
  // ---- World 5: longer machines, plus a spare piece that isn't needed
  {
    id: 21,
    ball: { x: 250, y: 150 },
    walls: [],
    blocks: [[880, 560, 90, 480]],
    bucket: { x: 1080, y: 1040 },
    tray: [
      { type: 'ramp', count: 1 },
      { type: 'bumper', count: 1 },
      { type: 'funnel', count: 1 },
      { type: 'fan', count: 1 },
    ],
    solution: [
      { type: 'ramp', x: 340, y: 500, dir: 1 },
      { type: 'bumper', x: 710, y: 800, dir: 1 },
      { type: 'funnel', x: 1160, y: 580, dir: 1 },
    ],
  },
  {
    id: 22,
    ball: { x: 250, y: 150 },
    walls: [],
    blocks: [[1150, 350, 80, 690], [1560, 560, 40, 480]],
    bucket: { x: 1400, y: 1040 },
    tray: [
      { type: 'conveyor', count: 1 },
      { type: 'cannon', count: 1 },
      { type: 'tramp', count: 1 },
    ],
    solution: [
      { type: 'conveyor', x: 330, y: 450, dir: 1 },
      { type: 'cannon', x: 760, y: 620, dir: 1 },
    ],
  },
  {
    id: 23,
    ball: { x: 600, y: 150 },
    walls: [],
    blocks: [[900, 700, 80, 340]],
    bucket: { x: 250, y: 1040 },
    fixed: [{ type: 'portal', x: 1300, y: 250, dir: 1 }],
    tray: [
      { type: 'portal', count: 1 },
      { type: 'slide', count: 1 },
      { type: 'fan', count: 1 },
      { type: 'ramp', count: 1 },
    ],
    solution: [
      { type: 'portal', x: 600, y: 580, dir: 1 },
      { type: 'slide', x: 1270, y: 490, dir: -1 },
      { type: 'fan', x: 1070, y: 670, dir: -1 },
    ],
  },
  {
    id: 24,
    ball: { x: 250, y: 150 },
    walls: [],
    blocks: [[1290, 720, 220, 320]],
    bucket: { x: 1400, y: 720 },
    tray: [
      { type: 'ramp', count: 1 },
      { type: 'tramp', count: 1 },
      { type: 'funnel', count: 1 },
      { type: 'cannon', count: 1 },
    ],
    solution: [
      { type: 'ramp', x: 330, y: 600, dir: 1 },
      { type: 'tramp', x: 800, y: 965, dir: 1 },
      { type: 'funnel', x: 1400, y: 460, dir: 1 },
    ],
  },
  {
    id: 25,
    ball: { x: 120, y: 150 },
    walls: [
      [230, 520, 360, 520, 12],
      [480, 520, 610, 520, 12],
    ],
    blocks: [[230, 520, 60, 520], [550, 520, 60, 520]],
    bucket: { x: 420, y: 1040 },
    fixed: [{ type: 'portal', x: 800, y: 200, dir: 1 }],
    tray: [
      { type: 'portal', count: 1 },
      { type: 'conveyor', count: 1 },
      { type: 'cannon', count: 1 },
      { type: 'funnel', count: 1 },
    ],
    solution: [
      { type: 'portal', x: 120, y: 330, dir: 1 },
      { type: 'conveyor', x: 790, y: 350, dir: 1 },
      { type: 'cannon', x: 1270, y: 530, dir: -1 },
      { type: 'funnel', x: 420, y: 360, dir: 1 },
    ],
  },
];
