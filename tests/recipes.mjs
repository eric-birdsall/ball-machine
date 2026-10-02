// Recipes for the generated levels: which pieces the ball meets, in order.
//   key:     stable level id (never reuse or rename: saved stars depend on it)
//   pieces:  solution pieces in the order the ball reaches them
//   decoys:  extra tray pieces that aren't needed
//   start:   'drop' or 'shelf' (default: chosen to suit the first piece)
//   pick:    use the n-th best candidate instead of the best (for variety)
const L = (key, pieces, extra = {}) => ({ key, pieces, ...extra });

export const RECIPES = [
  {
    title: 'World 3: planks and bricks',
    levels: [
      L('g21', ['plank']),
      L('g22', ['block']),
      L('g23', ['ramp', 'plank']),
      L('g24', ['conveyor', 'block']),
      L('g25', ['plank', 'funnel']),
      L('g26', ['slide', 'plank']),
      L('g27', ['ramp', 'block']),
      L('g28', ['plank', 'tramp']),
      L('g29', ['bumper', 'block']),
      L('g30', ['ramp', 'plank', 'block']),
    ],
  },
  {
    title: 'World 4: jelly cubes and boxing gloves',
    levels: [
      L('g31', ['jelly']),
      L('g32', ['glove']),
      L('g33', ['ramp', 'jelly']),
      L('g34', ['glove', 'funnel']),
      L('g35', ['jelly', 'plank']),
      L('g36', ['conveyor', 'glove']),
      L('g37', ['jelly', 'block']),
      L('g38', ['slide', 'jelly']),
      L('g39', ['glove', 'tramp']),
      L('g40', ['ramp', 'glove', 'plank']),
    ],
  },
  {
    title: 'World 5: pipes and escalators',
    levels: [
      L('g41', ['pipe']),
      L('g42', ['escalator']),
      L('g43', ['pipe', 'ramp']),
      L('g44', ['escalator', 'funnel']),
      L('g45', ['pipe', 'jelly']),
      L('g46', ['escalator', 'glove']),
      L('g47', ['pipe', 'tramp']),
      L('g48', ['conveyor', 'escalator']),
      L('g49', ['pipe', 'plank', 'block']),
      L('g50', ['escalator', 'pipe', 'funnel']),
    ],
  },
];
