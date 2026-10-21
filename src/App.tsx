import { useEffect, useState, useSyncExternalStore } from 'react';
import { LifeEngine, SPEEDS, type Stats } from './engine';
import { LifeCanvas, type Tool } from './LifeCanvas';
import { PALETTE_NAMES } from './palettes';
import { PATTERNS } from './patterns';
import { RULES } from './protocol';
import { Sparkline } from './Sparkline';

const SIZES = [
  { label: 'S', w: 120, h: 75 },
  { label: 'M', w: 200, h: 125 },
  { label: 'L', w: 320, h: 200 },
];

const EMPTY: Stats = { generation: 0, population: 0, stepMs: 0, fps: 0, running: false, history: [] };
const noop = () => () => {};

export default function App() {
  // Created inside an effect so StrictMode's mount/unmount/mount gets a live worker.
  const [engine, setEngine] = useState<LifeEngine | null>(null);
  useEffect(() => {
    const e = new LifeEngine();
    setEngine(e);
    return () => e.dispose();
  }, []);

  const stats = useSyncExternalStore(engine?.subscribe ?? noop, engine?.getSnapshot ?? (() => EMPTY));

  const [size, setSize] = useState(1);
  const [ruleIdx, setRuleIdx] = useState(0);
  const [speedIdx, setSpeedIdx] = useState(3);
  const [palette, setPalette] = useState(PALETTE_NAMES[0]);
  const [tool, setTool] = useState<Tool>('draw');
  const [density, setDensity] = useState(0.22);

  useEffect(() => {
    if (!engine) return;
    engine.pause();
    engine.init(SIZES[size].w, SIZES[size].h, density);
    // Density is applied by the Randomize button afterwards; resizing keeps the current value.
  }, [engine, size]);

  useEffect(() => engine?.setRule(RULES[ruleIdx]), [engine, ruleIdx]);
  useEffect(() => {
    if (engine) engine.speed = SPEEDS[speedIdx];
  }, [engine, speedIdx]);

  useEffect(() => {
    if (!engine) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'SELECT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (engine.getSnapshot().running) engine.pause();
        else engine.play();
      } else if (e.key === 's') engine.step();
      else if (e.key === 'r') engine.random(density);
      else if (e.key === 'c') engine.clear();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [engine, density]);

  if (!engine) return null;
  const rule = RULES[ruleIdx];
  const toolKey = typeof tool === 'object' ? tool.pattern : tool;

  return (
    <main>
      <section className="stage">
        <header>
          <h1>
            Life<span>Lab</span>
          </h1>
          <p>
            {rule.name} <code>{rule.notation}</code> on a {engine.w}×{engine.h} torus. Simulated in a Web Worker,
            painted from a typed array.
          </p>
        </header>
        <LifeCanvas engine={engine} palette={palette} tool={tool} />
        <p className="hint">
          <kbd>Space</kbd> play/pause · <kbd>S</kbd> step · <kbd>R</kbd> randomize · <kbd>C</kbd> clear · drag to draw
        </p>
      </section>

      <aside>
        <div className="stats">
          <div>
            <span>Generation</span>
            <b>{stats.generation.toLocaleString()}</b>
          </div>
          <div>
            <span>Population</span>
            <b>{stats.population.toLocaleString()}</b>
          </div>
          <div>
            <span>Gen/s</span>
            <b>{stats.running ? stats.fps * SPEEDS[speedIdx].n : '–'}</b>
          </div>
          <div>
            <span>Step time</span>
            <b>{stats.stepMs.toFixed(2)} ms</b>
          </div>
        </div>
        <Sparkline data={stats.history} />

        <div className="row">
          <button className="primary" onClick={() => (stats.running ? engine.pause() : engine.play())}>
            {stats.running ? 'Pause' : 'Play'}
          </button>
          <button onClick={() => engine.step()} disabled={stats.running}>
            Step
          </button>
          <button onClick={() => engine.random(density)}>Randomize</button>
          <button onClick={() => engine.clear()}>Clear</button>
        </div>

        <label>
          Speed <b>{SPEEDS[speedIdx].label}</b>
          <input type="range" min={0} max={SPEEDS.length - 1} value={speedIdx} onChange={(e) => setSpeedIdx(+e.target.value)} />
        </label>
        <label>
          Random density <b>{Math.round(density * 100)}%</b>
          <input type="range" min={5} max={60} value={density * 100} onChange={(e) => setDensity(+e.target.value / 100)} />
        </label>

        <h3>Rule</h3>
        <div className="chips">
          {RULES.map((r, i) => (
            <button key={r.name} className={i === ruleIdx ? 'on' : ''} onClick={() => setRuleIdx(i)} title={r.notation}>
              {r.name}
            </button>
          ))}
        </div>

        <h3>Grid</h3>
        <div className="chips">
          {SIZES.map((s, i) => (
            <button key={s.label} className={i === size ? 'on' : ''} onClick={() => setSize(i)}>
              {s.label} · {s.w}×{s.h}
            </button>
          ))}
        </div>

        <h3>Palette</h3>
        <div className="chips">
          {PALETTE_NAMES.map((p) => (
            <button key={p} className={p === palette ? 'on' : ''} onClick={() => setPalette(p)}>
              {p}
            </button>
          ))}
        </div>

        <h3>Brush</h3>
        <div className="chips">
          {(['draw', 'erase'] as const).map((t) => (
            <button key={t} className={toolKey === t ? 'on' : ''} onClick={() => setTool(t)}>
              {t === 'draw' ? 'Draw' : 'Erase'}
            </button>
          ))}
          {Object.keys(PATTERNS).map((p) => (
            <button key={p} className={toolKey === p ? 'on' : ''} onClick={() => setTool({ pattern: p })}>
              {p}
            </button>
          ))}
        </div>
      </aside>
    </main>
  );
}
