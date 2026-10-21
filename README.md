# Life Lab

A cellular automata playground. Conway's Game of Life and five other rule sets on a wrapping grid. Cells are colored by how long they have been alive.

![stack](https://img.shields.io/badge/React-18-61dafb) ![stack](https://img.shields.io/badge/Web%20Worker-typed%20arrays-22d3ee) ![stack](https://img.shields.io/badge/Canvas-ImageData-a855f7)

## What it shows

| Concept | Where |
| --- | --- |
| **Off-main-thread simulation**: the grid lives in a module Web Worker, so the UI stays responsive even at 320×200 in Turbo | `src/life.worker.ts` |
| **Transferable buffers**: each frame's `Uint8Array` is *moved* to the UI thread rather than copied | `src/life.worker.ts` |
| **Back-pressure loop**: the next generation is only requested once the previous frame arrives, so no queue builds up | `src/engine.ts` |
| **`useSyncExternalStore`**: stats come from a plain class with `subscribe` / `getSnapshot`, and frames skip React entirely | `src/engine.ts`, `src/App.tsx` |
| **Bitmask rules**: `B3/S23`-style rules compile to 9-bit masks, so a neighbour check is a single `&` | `src/life.worker.ts` |
| **Pixel-level rendering**: ages map through a 256-entry `Uint32Array` color LUT into `ImageData`, then scale up without smoothing | `src/LifeCanvas.tsx`, `src/palettes.ts` |
| **Pointer capture and line interpolation** so fast drags draw continuous strokes | `src/LifeCanvas.tsx` |

## Features

- Rules: Conway, HighLife, Day & Night, Seeds, Maze, Coral
- Stamp patterns: Glider, LWSS, R-pentomino, Acorn, Diehard (vanishes after 130 generations), Pentadecathlon, Beacon, Pulsar, Gosper glider gun
- Save the board as a PNG, palette included
- Three grid sizes, five speeds, three age palettes, live population sparkline
- Keyboard: `Space` play/pause, `S` step, `R` randomize, `C` clear, `P` save PNG

## Run it

```bash
npm install
npm run dev
```
