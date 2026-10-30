export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function round(value: number, decimals = 0): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
}

export function quantile(values: number[], q: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * clamp(q, 0, 1);
  const base = Math.floor(position);
  const rest = position - base;
  return sorted[base + 1] !== undefined
    ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
    : sorted[base];
}

/** Percentile rank (0–100), tie-aware. */
export function percentileRanks(values: number[]): number[] {
  const n = values.length;
  if (n === 0) return [];
  if (n === 1) return [50];
  const sorted = [...values].sort((a, b) => a - b);
  return values.map((value) => {
    let below = 0;
    let equal = 0;
    for (const candidate of sorted) {
      if (candidate < value) below += 1;
      else if (candidate === value) equal += 1;
      else break;
    }
    return ((below + (equal - 1) / 2) / (n - 1)) * 100;
  });
}

export function logGrowth(points: Array<{ t: number; views: number }>, windowDays = 7): number | null {
  if (points.length < 2) return null;
  const latest = points[points.length - 1].t;
  const cutoff = latest - windowDays * 86_400_000;
  const recent = points.filter((point) => point.t >= cutoff && point.views > 0);
  const sample = recent.length >= 2 ? recent : points.filter((point) => point.views > 0).slice(-3);
  if (sample.length < 2) return null;
  const x = sample.map((point) => (point.t - sample[0].t) / 86_400_000);
  const y = sample.map((point) => Math.log(point.views));
  const span = x[x.length - 1] - x[0];
  if (span < 0.01) return null;
  const meanX = mean(x);
  const meanY = mean(y);
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < x.length; i += 1) {
    numerator += (x[i] - meanX) * (y[i] - meanY);
    denominator += (x[i] - meanX) ** 2;
  }
  if (denominator === 0) return null;
  return clamp(numerator / denominator, -0.5, 1.2);
}

export function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededRandom(key: string): () => number {
  return mulberry32(hashString(key));
}

export function pick<T>(items: T[], random: () => number): T {
  return items[Math.floor(random() * items.length) % items.length];
}

export function weightedPick<T>(items: T[], weights: number[], random: () => number): T {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let threshold = random() * total;
  for (let i = 0; i < items.length; i += 1) {
    threshold -= weights[i];
    if (threshold <= 0) return items[i];
  }
  return items[items.length - 1];
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .map((word) => (word.length > 2 ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}

const CASE_MAP: Record<string, string> = {
  iphone: "iPhone",
  ipad: "iPad",
  ios: "iOS",
  macos: "macOS",
  ai: "AI",
  "k-pop": "K-pop",
  gta: "GTA",
  nba: "NBA",
  nfl: "NFL",
  f1: "F1",
  ev: "EV",
  vr: "VR",
  ar: "AR",
  xr: "XR",
  ui: "UI",
  ux: "UX",
  ml: "ML",
  nft: "NFT",
  "3d": "3D",
  "4k": "4K",
  "8k": "8K",
  lofi: "lo-fi",
  valorant: "Valorant",
  minecraft: "Minecraft",
  youtube: "YouTube",
  tiktok: "TikTok"
};

/** Restores common brand/acronym casing to a normalised keyword term. */
export function smartCaseTerm(term: string): string {
  return term
    .split(/\s+/)
    .map((word) => CASE_MAP[word] ?? word)
    .join(" ");
}

export function parseISODuration(duration: string): number {
  const match = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(duration);
  if (!match) return 0;
  const [, days = "0", hours = "0", minutes = "0", seconds = "0"] = match;
  return Number(days) * 86_400 + Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}

export function daysSince(iso: string, now = Date.now()): number {
  return Math.max(0, (now - new Date(iso).getTime()) / 86_400_000);
}

export function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

export function normalizeTerm(term: string): string {
  return term.trim().toLowerCase().replace(/\s+/g, " ");
}
