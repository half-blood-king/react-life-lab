type RGB = [number, number, number];

const STOPS: Record<string, RGB[]> = {
  Neon: [
    [236, 254, 255],
    [34, 211, 238],
    [168, 85, 247],
    [76, 29, 149],
  ],
  Ember: [
    [255, 251, 235],
    [251, 191, 36],
    [239, 68, 68],
    [127, 29, 29],
  ],
  Moss: [
    [240, 253, 244],
    [74, 222, 128],
    [21, 128, 61],
    [20, 83, 45],
  ],
};

export const PALETTE_NAMES = Object.keys(STOPS);
export const BACKGROUND: RGB = [8, 10, 22];

/**
 * 256-entry RGBA lookup table indexed by cell age. Age is mapped on a log scale
 * so newborn cells flash bright and long-lived structures settle into the dark end.
 */
export function buildLut(name: string): Uint32Array {
  const stops = STOPS[name];
  const lut = new Uint32Array(256);
  const pack = ([r, g, b]: RGB) => (255 << 24) | (b << 16) | (g << 8) | r; // little-endian RGBA
  lut[0] = pack(BACKGROUND);
  for (let age = 1; age < 256; age++) {
    const t = Math.log(age) / Math.log(255);
    const pos = t * (stops.length - 1);
    const i = Math.min(Math.floor(pos), stops.length - 2);
    const f = pos - i;
    const mix = stops[i].map((c, k) => Math.round(c + (stops[i + 1][k] - c) * f)) as RGB;
    lut[age] = pack(mix);
  }
  return lut;
}
