import type { Frame, ToWorker } from './protocol';

// The project compiles against the DOM lib, so describe the worker scope we use.
const scope = self as unknown as {
  postMessage(message: Frame, transfer: Transferable[]): void;
  onmessage: ((e: MessageEvent<ToWorker>) => void) | null;
};

let w = 0;
let h = 0;
let cur = new Uint8Array(0);
let nxt = new Uint8Array(0);
let generation = 0;
let lastStepMs = 0;
// Rules as 9-bit masks: bit k set means "k neighbours triggers this".
let birthMask = 1 << 3;
let surviveMask = (1 << 2) | (1 << 3);

const mask = (counts: number[]) => counts.reduce((m, c) => m | (1 << c), 0);

function step() {
  for (let y = 0; y < h; y++) {
    // Toroidal wrap: precompute the three row offsets once per row.
    const up = ((y - 1 + h) % h) * w;
    const row = y * w;
    const down = ((y + 1) % h) * w;
    for (let x = 0; x < w; x++) {
      const l = (x - 1 + w) % w;
      const r = (x + 1) % w;
      const n =
        (cur[up + l] > 0 ? 1 : 0) +
        (cur[up + x] > 0 ? 1 : 0) +
        (cur[up + r] > 0 ? 1 : 0) +
        (cur[row + l] > 0 ? 1 : 0) +
        (cur[row + r] > 0 ? 1 : 0) +
        (cur[down + l] > 0 ? 1 : 0) +
        (cur[down + x] > 0 ? 1 : 0) +
        (cur[down + r] > 0 ? 1 : 0);
      const age = cur[row + x];
      if (age > 0) nxt[row + x] = surviveMask & (1 << n) ? Math.min(age + 1, 255) : 0;
      else nxt[row + x] = birthMask & (1 << n) ? 1 : 0;
    }
  }
  [cur, nxt] = [nxt, cur];
  generation++;
}

function post() {
  let population = 0;
  for (let i = 0; i < cur.length; i++) if (cur[i]) population++;
  const cells = cur.slice();
  const frame: Frame = { type: 'frame', cells, w, h, generation, population, stepMs: lastStepMs };
  scope.postMessage(frame, [cells.buffer]);
}

scope.onmessage = (e: MessageEvent<ToWorker>) => {
  const msg = e.data;
  switch (msg.type) {
    case 'init':
      w = msg.w;
      h = msg.h;
      cur = new Uint8Array(w * h);
      nxt = new Uint8Array(w * h);
      generation = 0;
      break;
    case 'step': {
      const t0 = performance.now();
      for (let i = 0; i < msg.n; i++) step();
      lastStepMs = (performance.now() - t0) / msg.n;
      break;
    }
    case 'paint':
      for (const i of msg.cells) if (i >= 0 && i < cur.length) cur[i] = msg.alive ? Math.max(cur[i], 1) : 0;
      break;
    case 'random':
      for (let i = 0; i < cur.length; i++) cur[i] = Math.random() < msg.density ? 1 : 0;
      generation = 0;
      break;
    case 'clear':
      cur.fill(0);
      generation = 0;
      break;
    case 'rule':
      birthMask = mask(msg.birth);
      surviveMask = mask(msg.survive);
      break;
    case 'render':
      break;
  }
  post();
};
