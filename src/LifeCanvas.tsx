import { useEffect, useRef } from 'react';
import type { LifeEngine } from './engine';
import { buildLut } from './palettes';
import { PATTERNS, stamp } from './patterns';

export type Tool = 'draw' | 'erase' | { pattern: string };

interface Props {
  engine: LifeEngine;
  palette: string;
  tool: Tool;
}

/** Cells between two points, so a fast drag still paints a continuous line. */
function line(x0: number, y0: number, x1: number, y1: number): [number, number][] {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  return Array.from({ length: steps + 1 }, (_, i) => [
    Math.round(x0 + ((x1 - x0) * i) / steps),
    Math.round(y0 + ((y1 - y0) * i) / steps),
  ]);
}

export function LifeCanvas({ engine, palette, tool }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lutRef = useRef(buildLut(palette));
  const lastFrame = useRef<Parameters<NonNullable<LifeEngine['onFrame']>>[0] | null>(null);
  const drawRef = useRef<() => void>(() => {});

  useEffect(() => {
    lutRef.current = buildLut(palette);
    drawRef.current();
  }, [palette]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const off = document.createElement('canvas');
    const offCtx = off.getContext('2d')!;
    let image: ImageData | null = null;

    // Paint ages into a 1px-per-cell offscreen image, then scale it up crisply.
    const draw = () => {
      const f = lastFrame.current;
      if (!f) return;
      if (off.width !== f.w || off.height !== f.h || !image) {
        off.width = f.w;
        off.height = f.h;
        image = offCtx.createImageData(f.w, f.h);
      }
      const px = new Uint32Array(image.data.buffer);
      const lut = lutRef.current;
      for (let i = 0; i < f.cells.length; i++) px[i] = lut[f.cells[i]];
      offCtx.putImageData(image, 0, 0);

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const cw = Math.round(rect.width * dpr);
      const ch = Math.round(rect.height * dpr);
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
      }
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(off, 0, 0, cw, ch);
    };

    drawRef.current = draw;
    engine.onFrame = (f) => {
      lastFrame.current = f;
      draw();
    };
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => {
      engine.onFrame = null;
      ro.disconnect();
    };
  }, [engine]);

  const dragging = useRef<{ x: number; y: number } | null>(null);

  const cellAt = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: Math.floor(((e.clientX - rect.left) / rect.width) * engine.w),
      y: Math.floor(((e.clientY - rect.top) / rect.height) * engine.h),
    };
  };

  const onDown = (e: React.PointerEvent) => {
    const { x, y } = cellAt(e);
    if (typeof tool === 'object') {
      engine.paint(stamp(PATTERNS[tool.pattern], x, y, engine.w, engine.h), true);
      return;
    }
    (e.target as Element).setPointerCapture(e.pointerId);
    dragging.current = { x, y };
    engine.paint([y * engine.w + x], tool === 'draw');
  };

  const onMove = (e: React.PointerEvent) => {
    if (!dragging.current || typeof tool === 'object') return;
    const { x, y } = cellAt(e);
    const prev = dragging.current;
    if (prev.x === x && prev.y === y) return;
    const cells = line(prev.x, prev.y, x, y)
      .filter(([cx, cy]) => cx >= 0 && cy >= 0 && cx < engine.w && cy < engine.h)
      .map(([cx, cy]) => cy * engine.w + cx);
    engine.paint(cells, tool === 'draw');
    dragging.current = { x, y };
  };

  return (
    <canvas
      ref={canvasRef}
      className={typeof tool === 'object' ? 'board stamp' : 'board'}
      style={{ aspectRatio: `${engine.w} / ${engine.h}` }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={() => (dragging.current = null)}
    />
  );
}
