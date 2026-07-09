const N = 624;
const M = 397;
const MATRIX_A = 0x9908b0df;
const UPPER_MASK = 0x80000000;
const LOWER_MASK = 0x7fffffff;

export class PythonRandom {
  private mt = new Uint32Array(N);
  private mti = N + 1;

  constructor(seedVal: number) {
    this.seed(seedVal);
  }

  private initGenrand(s: number) {
    this.mt[0] = s >>> 0;
    for (this.mti = 1; this.mti < N; this.mti++) {
      const prev = this.mt[this.mti - 1];
      const val = Math.imul(1812433253, prev ^ (prev >>> 30)) + this.mti;
      this.mt[this.mti] = val >>> 0;
    }
  }

  private initByArray(initKey: number[]) {
    this.initGenrand(19650218);
    let i = 1;
    let j = 0;
    const keyLength = initKey.length;
    let k = N > keyLength ? N : keyLength;
    for (; k; k--) {
      const prev = this.mt[i - 1];
      const mix = (this.mt[i] ^ Math.imul(prev ^ (prev >>> 30), 1664525)) >>> 0;
      this.mt[i] = (mix + initKey[j] + j) >>> 0;
      i++;
      j++;
      if (i >= N) {
        this.mt[0] = this.mt[N - 1];
        i = 1;
      }
      if (j >= keyLength) {
        j = 0;
      }
    }
    for (k = N - 1; k; k--) {
      const prev = this.mt[i - 1];
      const mix = (this.mt[i] ^ Math.imul(prev ^ (prev >>> 30), 1566083941)) >>> 0;
      this.mt[i] = (mix - i) >>> 0;
      i++;
      if (i >= N) {
        this.mt[0] = this.mt[N - 1];
        i = 1;
      }
    }
    this.mt[0] = 0x80000000;
  }

  public seed(seedVal: number) {
    const s = Math.abs(seedVal) >>> 0;
    this.initByArray([s]);
  }

  public next32(): number {
    let y: number;
    const mag01 = [0, MATRIX_A];

    if (this.mti >= N) {
      let kk;
      if (this.mti === N + 1) {
        this.initGenrand(5489);
      }
      for (kk = 0; kk < N - M; kk++) {
        y = (this.mt[kk] & UPPER_MASK) | (this.mt[kk + 1] & LOWER_MASK);
        this.mt[kk] = this.mt[kk + M] ^ (y >>> 1) ^ mag01[y & 1];
      }
      for (; kk < N - 1; kk++) {
        y = (this.mt[kk] & UPPER_MASK) | (this.mt[kk + 1] & LOWER_MASK);
        this.mt[kk] = this.mt[kk + (M - N)] ^ (y >>> 1) ^ mag01[y & 1];
      }
      y = (this.mt[N - 1] & UPPER_MASK) | (this.mt[0] & LOWER_MASK);
      this.mt[N - 1] = this.mt[M - 1] ^ (y >>> 1) ^ mag01[y & 1];
      this.mti = 0;
    }

    y = this.mt[this.mti++];

    y ^= y >>> 11;
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= y >>> 18;

    return y >>> 0;
  }

  public random(): number {
    const a = this.next32() >>> 5;
    const b = this.next32() >>> 6;
    return (a * 67108864.0 + b) / 9007199254740992.0;
  }

  public _randbelow(n: number): number {
    const k = n.toString(2).length;
    let r = this.getrandbits(k);
    while (r >= n) {
      r = this.getrandbits(k);
    }
    return r;
  }

  public getrandbits(k: number): number {
    if (k === 0) return 0;
    if (k <= 32) {
      return this.next32() >>> (32 - k);
    }
    const words = Math.ceil(k / 32);
    let res = 0n;
    for (let i = 0; i < words; i++) {
      const w = BigInt(this.next32());
      res = res | (w << BigInt(i * 32));
    }
    const mask = (1n << BigInt(k)) - 1n;
    return Number(res & mask);
  }

  public randint(a: number, b: number): number {
    return a + this._randbelow(b - a + 1);
  }

  public uniform(a: number, b: number): number {
    return a + (b - a) * this.random();
  }

  public sample<T>(population: T[], k: number): T[] {
    const n = population.length;
    if (k > n) throw new Error("Sample larger than population");
    const result = new Array<T>(k);
    const selected = new Set<number>();
    for (let i = 0; i < k; i++) {
      let j = this._randbelow(n);
      while (selected.has(j)) {
        j = this._randbelow(n);
      }
      selected.add(j);
      result[i] = population[j];
    }
    return result;
  }
}

export interface CatppuccinTheme {
  name: string;
  base: string;
  mantle: string;
  crust: string;
  text: string;
  surface0: string;
  surface1: string;
  surface2: string;
  overlay0: string;
  rosewater: string;
  flamingo: string;
  pink: string;
  mauve: string;
  red: string;
  maroon: string;
  peach: string;
  yellow: string;
  green: string;
  teal: string;
  sky: string;
  sapphire: string;
  blue: string;
  lavender: string;
}

export const CATPPUCCIN_THEMES: Record<string, CatppuccinTheme> = {
  mocha: {
    name: "Mocha",
    base: "#11111b", mantle: "#181825", crust: "#11111b", text: "#cdd6f4",
    surface0: "#313244", surface1: "#45475a", surface2: "#585b70", overlay0: "#6c7086",
    rosewater: "#f5e0dc", flamingo: "#f2cdcd", pink: "#f5c2e7", mauve: "#cba6f7",
    red: "#f38ba8", maroon: "#eba0ac", peach: "#fab387", yellow: "#f9e2af",
    green: "#a6e3a1", teal: "#94e2d5", sky: "#89dceb", sapphire: "#74c7ec",
    blue: "#89b4fa", lavender: "#b4befe"
  },
  macchiato: {
    name: "Macchiato",
    base: "#24273a", mantle: "#1e2030", crust: "#181926", text: "#cad3f5",
    surface0: "#31354a", surface1: "#494d64", surface2: "#5b6078", overlay0: "#6e738d",
    rosewater: "#f4dbd6", flamingo: "#f0c6c6", pink: "#f5bde6", mauve: "#c6a0f6",
    red: "#ed8796", maroon: "#ee99a0", peach: "#f5a97f", yellow: "#eed49f",
    green: "#a6da95", teal: "#8bd5ca", sky: "#91d7e3", sapphire: "#7dc4e4",
    blue: "#8aadf4", lavender: "#b7bdf8"
  },
  frappe: {
    name: "Frappé",
    base: "#303446", mantle: "#292c3c", crust: "#232634", text: "#c6d0f5",
    surface0: "#414559", surface1: "#51576d", surface2: "#626880", overlay0: "#737994",
    rosewater: "#f2d5cf", flamingo: "#eebebe", pink: "#f4b8e4", mauve: "#ca9ee6",
    red: "#e78284", maroon: "#ea999c", peach: "#ef9f76", yellow: "#e5c890",
    green: "#a6d189", teal: "#81c8be", sky: "#99d1db", sapphire: "#85c1dc",
    blue: "#8caaee", lavender: "#babbf1"
  },
  latte: {
    name: "Latte",
    base: "#eff1f5", mantle: "#e6e9ef", crust: "#dce0e8", text: "#4c4f69",
    surface0: "#ccd0da", surface1: "#bcc0cc", surface2: "#acb0be", overlay0: "#9ca0b0",
    rosewater: "#dc8a78", flamingo: "#dd7878", pink: "#ea76cb", mauve: "#8839ef",
    red: "#d20f39", maroon: "#e64553", peach: "#fe640b", yellow: "#df8e1d",
    green: "#40a02b", teal: "#179287", sky: "#04a5e5", sapphire: "#209fb5",
    blue: "#1e66f5", lavender: "#7287fd"
  }
};

export const ACCENTS = [
  "rosewater",
  "flamingo",
  "pink",
  "mauve",
  "red",
  "maroon",
  "peach",
  "yellow",
  "green",
  "teal",
  "sky",
  "sapphire",
  "blue",
  "lavender"
];

export function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return [h, s, l];
}

export function hueDistance(h1: number, h2: number): number {
  const d = Math.abs(h1 - h2);
  return Math.min(d, 1.0 - d);
}

export function pickDistinctAccents(rng: PythonRandom, theme: CatppuccinTheme): [string, string] {
  const MIN_HUE_GAP = 0.12;
  for (let iteration = 0; iteration < 200; iteration++) {
    const sampled = rng.sample(ACCENTS, 2);
    const a = sampled[0];
    const b = sampled[1];
    const h1 = rgbToHsl(...hexToRgb(theme[a as keyof CatppuccinTheme] as string))[0];
    const h2 = rgbToHsl(...hexToRgb(theme[b as keyof CatppuccinTheme] as string))[0];
    if (hueDistance(h1, h2) >= MIN_HUE_GAP) {
      return [a, b];
    }
  }

  // Fallback: widest gap
  let bestA = ACCENTS[0];
  let bestB = ACCENTS[1];
  let maxDist = -1;
  for (let i = 0; i < ACCENTS.length; i++) {
    for (let j = i + 1; j < ACCENTS.length; j++) {
      const a = ACCENTS[i];
      const b = ACCENTS[j];
      const h1 = rgbToHsl(...hexToRgb(theme[a as keyof CatppuccinTheme] as string))[0];
      const h2 = rgbToHsl(...hexToRgb(theme[b as keyof CatppuccinTheme] as string))[0];
      const dist = hueDistance(h1, h2);
      if (dist > maxDist) {
        maxDist = dist;
        bestA = a;
        bestB = b;
      }
    }
  }
  return [bestA, bestB];
}

export function lerpColor(c1: string, c2: string, t: number): string {
  const r1 = parseInt(c1.slice(1, 3), 16);
  const g1 = parseInt(c1.slice(3, 5), 16);
  const b1 = parseInt(c1.slice(5, 7), 16);

  const r2 = parseInt(c2.slice(1, 3), 16);
  const g2 = parseInt(c2.slice(3, 5), 16);
  const b2 = parseInt(c2.slice(5, 7), 16);

  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);

  const hex = (x: number) => x.toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

export interface PetalControlPoints {
  p1: [number, number];
  p2: [number, number];
}

export interface PetalFamily {
  N: number;
  lw: number;
  alpha: number;
  R: number;
  p1: [number, number];
  p2: [number, number];
  petalPaths: { d: string; color: string }[];
}

export interface PatternConfig {
  seed: number;
  accent1Name: string;
  accent2Name: string;
  accent1: string;
  accent2: string;
  semiMajor: number;
  pupilR: number;
  families: PetalFamily[];
}

function rotatePoint(x: number, y: number, angle: number): [number, number] {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [x * cos - y * sin, x * sin + y * cos];
}

export function buildPattern(
  seed: number,
  themeKey: string,
  areaScale = 1.0,
  customAccents?: [string, string]
): PatternConfig {
  const rng = new PythonRandom(seed);
  const theme = CATPPUCCIN_THEMES[themeKey] || CATPPUCCIN_THEMES.mocha;

  let accent1Name: string;
  let accent2Name: string;
  if (customAccents) {
    accent1Name = customAccents[0];
    accent2Name = customAccents[1];
  } else {
    [accent1Name, accent2Name] = pickDistinctAccents(rng, theme);
  }

  const accent1 = theme[accent1Name as keyof CatppuccinTheme] as string;
  const accent2 = theme[accent2Name as keyof CatppuccinTheme] as string;

  let semiMajor = rng.uniform(0.34, 0.46);
  let pupilR = semiMajor * rng.uniform(0.06, 0.13);

  if (areaScale !== 1.0) {
    const k = Math.sqrt(areaScale);
    semiMajor *= k;
    pupilR *= k;
  }

  const lwScale = Math.sqrt(areaScale);
  const numFamilies = rng.randint(2, 4);
  const families: PetalFamily[] = [];

  for (let i = 0; i < numFamilies; i++) {
    const RFam = semiMajor * rng.uniform(0.65, 1.0);
    const symN = rng.randint(14, 46);
    const density = (0.7 * (symN - 14)) / 32.0 + (0.3 * (numFamilies - 2)) / 2.0;
    const lw = rng.uniform(1.4, 2.4) * (1.0 - 0.15 * density) * lwScale * 1.8;
    const alpha = rng.uniform(0.28, 0.55);

    // Generate random control points for the petal
    const r1 = rng.uniform(0.06, 0.72) * RFam;
    const a1 = rng.uniform(-0.25, 0.85) * Math.PI;
    const p1: [number, number] = [r1 * Math.cos(a1), r1 * Math.sin(a1)];

    const r2 = rng.uniform(0.22, 0.96) * RFam;
    const a2 = rng.uniform(-0.12, 0.62) * Math.PI;
    const p2: [number, number] = [r2 * Math.cos(a2), r2 * Math.sin(a2)];

    // Mirror points for lower half of petal
    const p1Low: [number, number] = [p1[0], -p1[1]];
    const p2Low: [number, number] = [p2[0], -p2[1]];

    // Build the symN rotated copies of the petal
    const petalPaths: { d: string; color: string }[] = [];
    for (let k = 0; k < symN; k++) {
      const angle = (k * 2.0 * Math.PI) / symN;

      const p1Rot = rotatePoint(p1[0], p1[1], angle);
      const p2Rot = rotatePoint(p2[0], p2[1], angle);
      const p3Rot = rotatePoint(RFam, 0, angle);

      const p2LowRot = rotatePoint(p2Low[0], p2Low[1], angle);
      const p1LowRot = rotatePoint(p1Low[0], p1Low[1], angle);

      const d = `M 0 0 C ${p1Rot[0].toFixed(3)} ${p1Rot[1].toFixed(3)}, ${p2Rot[0].toFixed(3)} ${p2Rot[1].toFixed(3)}, ${p3Rot[0].toFixed(3)} ${p3Rot[1].toFixed(3)} C ${p2LowRot[0].toFixed(3)} ${p2LowRot[1].toFixed(3)}, ${p1LowRot[0].toFixed(3)} ${p1LowRot[1].toFixed(3)}, 0 0`;

      const tC = 0.5 * (1.0 - Math.cos((2.0 * Math.PI * k) / symN));
      const color = lerpColor(accent1, accent2, tC);

      petalPaths.push({ d, color });
    }

    families.push({
      N: symN,
      lw,
      alpha,
      R: RFam,
      p1,
      p2,
      petalPaths
    });
  }

  return {
    seed,
    accent1Name,
    accent2Name,
    accent1,
    accent2,
    semiMajor,
    pupilR,
    families
  };
}
