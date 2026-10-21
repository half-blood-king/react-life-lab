/** Messages between the UI thread and the simulation worker. */
export type ToWorker =
  | { type: 'init'; w: number; h: number }
  | { type: 'step'; n: number }
  | { type: 'paint'; cells: number[]; alive: boolean }
  | { type: 'random'; density: number }
  | { type: 'clear' }
  | { type: 'rule'; birth: number[]; survive: number[] }
  | { type: 'render' };

export interface Frame {
  type: 'frame';
  /** Cell ages: 0 = dead, 1..255 = generations alive. Transferred, not copied. */
  cells: Uint8Array;
  w: number;
  h: number;
  generation: number;
  population: number;
  stepMs: number;
}

export interface Rule {
  name: string;
  notation: string;
  birth: number[];
  survive: number[];
}

export const RULES: Rule[] = [
  { name: 'Conway', notation: 'B3/S23', birth: [3], survive: [2, 3] },
  { name: 'HighLife', notation: 'B36/S23', birth: [3, 6], survive: [2, 3] },
  { name: 'Day & Night', notation: 'B3678/S34678', birth: [3, 6, 7, 8], survive: [3, 4, 6, 7, 8] },
  { name: 'Seeds', notation: 'B2/S', birth: [2], survive: [] },
  { name: 'Maze', notation: 'B3/S12345', birth: [3], survive: [1, 2, 3, 4, 5] },
  { name: 'Coral', notation: 'B3/S45678', birth: [3], survive: [4, 5, 6, 7, 8] },
];
