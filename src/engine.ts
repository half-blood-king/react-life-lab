import type { Frame, Rule, ToWorker } from './protocol';

export interface Stats {
  generation: number;
  population: number;
  stepMs: number;
  fps: number;
  running: boolean;
  history: number[];
}

export interface Speed {
  label: string;
  delay: number; // ms between generations, 0 = next animation frame
  n: number; // generations per request
}

export const SPEEDS: Speed[] = [
  { label: '2/s', delay: 500, n: 1 },
  { label: '8/s', delay: 125, n: 1 },
  { label: '20/s', delay: 50, n: 1 },
  { label: '60/s', delay: 0, n: 1 },
  { label: 'Turbo', delay: 0, n: 6 },
];

const HISTORY = 240;

/**
 * Owns the worker and runs the loop. Exposes a subscribe/getSnapshot pair so
 * React can read stats via useSyncExternalStore, while frames go straight to
 * the canvas through `onFrame` without touching React state at all.
 */
export class LifeEngine {
  private worker: Worker;
  private listeners = new Set<() => void>();
  private sent: ToWorker['type'][] = [];
  private frameTimes: number[] = [];
  private timer = 0;
  private snapshot: Stats = { generation: 0, population: 0, stepMs: 0, fps: 0, running: false, history: [] };
  speed: Speed = SPEEDS[3];
  onFrame: ((f: Frame) => void) | null = null;
  w = 0;
  h = 0;

  constructor() {
    this.worker = new Worker(new URL('./life.worker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = (e: MessageEvent<Frame>) => this.handle(e.data);
  }

  private send(msg: ToWorker) {
    this.sent.push(msg.type);
    this.worker.postMessage(msg);
  }

  private handle(frame: Frame) {
    const cause = this.sent.shift();
    this.onFrame?.(frame);

    const now = performance.now();
    if (cause === 'step') {
      this.frameTimes.push(now);
      while (this.frameTimes.length && now - this.frameTimes[0] > 1000) this.frameTimes.shift();
    }
    const history = cause === 'step' || this.snapshot.history.length === 0
      ? [...this.snapshot.history.slice(-(HISTORY - 1)), frame.population]
      : this.snapshot.history;
    this.set({
      generation: frame.generation,
      population: frame.population,
      stepMs: frame.stepMs,
      fps: this.frameTimes.length,
      history,
    });

    // Back-pressure: only ask for the next generation once this one has arrived.
    if (cause === 'step' && this.snapshot.running) this.schedule();
  }

  private schedule() {
    const go = () => this.send({ type: 'step', n: this.speed.n });
    if (this.speed.delay === 0) this.timer = requestAnimationFrame(go);
    else this.timer = window.setTimeout(go, this.speed.delay);
  }

  private set(patch: Partial<Stats>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((l) => l());
  }

  subscribe = (l: () => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };

  getSnapshot = () => this.snapshot;

  init(w: number, h: number, density = 0.22) {
    this.w = w;
    this.h = h;
    this.set({ history: [] });
    this.send({ type: 'init', w, h });
    this.send({ type: 'random', density });
  }

  play() {
    if (this.snapshot.running) return;
    this.set({ running: true });
    this.send({ type: 'step', n: this.speed.n });
  }

  pause() {
    cancelAnimationFrame(this.timer);
    clearTimeout(this.timer);
    this.frameTimes = [];
    this.set({ running: false, fps: 0 });
  }

  step() {
    if (!this.snapshot.running) this.send({ type: 'step', n: 1 });
  }

  paint(cells: number[], alive: boolean) {
    this.send({ type: 'paint', cells, alive });
  }

  random(density: number) {
    this.set({ history: [] });
    this.send({ type: 'random', density });
  }

  clear() {
    this.set({ history: [] });
    this.send({ type: 'clear' });
  }

  setRule(rule: Rule) {
    this.send({ type: 'rule', birth: rule.birth, survive: rule.survive });
  }

  dispose() {
    this.pause();
    this.worker.terminate();
  }
}
