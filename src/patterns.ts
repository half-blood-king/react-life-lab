/** Classic patterns in plaintext format: O = alive, . = dead. */
export const PATTERNS: Record<string, string[]> = {
  Glider: ['.O.', '..O', 'OOO'],
  'Spaceship (LWSS)': ['.O..O', 'O....', 'O...O', 'OOOO.'],
  'R-pentomino': ['.OO', 'OO.', '.O.'],
  Acorn: ['.O.....', '...O...', 'OO..OOO'],
  Diehard: ['......O.', 'OO......', '.O...OOO'],
  Pentadecathlon: ['..O....O..', 'OO.OOOO.OO', '..O....O..'],
  Beacon: ['OO..', 'OO..', '..OO', '..OO'],
  Pulsar: [
    '..OOO...OOO..',
    '.............',
    'O....O.O....O',
    'O....O.O....O',
    'O....O.O....O',
    '..OOO...OOO..',
    '.............',
    '..OOO...OOO..',
    'O....O.O....O',
    'O....O.O....O',
    'O....O.O....O',
    '.............',
    '..OOO...OOO..',
  ],
  'Gosper glider gun': [
    '........................O...........',
    '......................O.O...........',
    '............OO......OO............OO',
    '...........O...O....OO............OO',
    'OO........O.....O...OO..............',
    'OO........O...O.OO....O.O...........',
    '..........O.....O.......O...........',
    '...........O...O....................',
    '............OO......................',
  ],
};

/** Cell indices for a pattern centred on (cx, cy) in a w×h toroidal grid. */
export function stamp(rows: string[], cx: number, cy: number, w: number, h: number): number[] {
  const ox = cx - Math.floor(rows[0].length / 2);
  const oy = cy - Math.floor(rows.length / 2);
  const out: number[] = [];
  rows.forEach((row, dy) =>
    [...row].forEach((ch, dx) => {
      if (ch !== 'O') return;
      const x = (ox + dx + w) % w;
      const y = (oy + dy + h) % h;
      out.push(y * w + x);
    }),
  );
  return out;
}
