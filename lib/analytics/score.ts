import type { ScoreBreakdown, Trajectory } from "../types";
import { clamp } from "../utils";

const COMPONENT_KEYS: Array<keyof ScoreBreakdown> = [
  "velocity",
  "momentum",
  "engagement",
  "freshness",
  "reach",
  "relevance"
];

export function weightsFor(precision: number, hasFocus: boolean): ScoreBreakdown {
  const p = clamp(precision, 0, 100) / 100;
  const raw: ScoreBreakdown = {
    velocity: 0.28 - 0.04 * p,
    momentum: 0.22 + 0.1 * p,
    engagement: 0.18 + 0.03 * p,
    freshness: 0.16 - 0.06 * p,
    reach: 0.12 - 0.03 * p,
    relevance: hasFocus ? 0.04 : 0
  };
  const total = COMPONENT_KEYS.reduce((sum, key) => sum + raw[key], 0);
  return COMPONENT_KEYS.reduce(
    (weights, key) => {
      weights[key] = Number((raw[key] / total).toFixed(3));
      return weights;
    },
    { ...raw }
  );
}

export function trendScoreFrom(scores: ScoreBreakdown, weights: ScoreBreakdown, precision: number): number {
  const composite =
    scores.velocity * weights.velocity +
    scores.momentum * weights.momentum +
    scores.engagement * weights.engagement +
    scores.freshness * weights.freshness +
    scores.reach * weights.reach +
    scores.relevance * weights.relevance;
  const contrast = 1 + (clamp(precision, 0, 100) / 100) * 0.18;
  return Math.round(clamp(50 + (composite - 50) * contrast, 0, 100) * 10) / 10;
}

/** Logistic breakout classifier calibrated against momentum-led signals. */
export function breakoutProbability(scores: ScoreBreakdown): number {
  const m = scores.momentum / 100;
  const v = scores.velocity / 100;
  const e = scores.engagement / 100;
  const f = scores.freshness / 100;
  const r = scores.reach / 100;
  const z = -5.1 + 2.4 * m + 1.9 * v + 1.2 * e + 0.7 * f + 0.4 * r;
  const probability = 1 / (1 + Math.exp(-z));
  return Math.round(clamp(probability, 0.01, 0.97) * 1000) / 1000;
}

export function heuristicMomentum(velocityRank: number, engagementRank: number, ageDays: number): number {
  const estimate =
    0.012 + (velocityRank / 100) * 0.055 + (engagementRank / 100) * 0.035 - Math.max(0, ageDays - 14) * 0.0012;
  return Number(clamp(estimate, 0.004, 0.2).toFixed(4));
}

export function inferTrajectory(
  momentum: number,
  acceleration: number,
  known?: Trajectory
): Trajectory {
  if (known) return known;
  if (acceleration > 0.05 && momentum > 0.05) return "spike";
  if (momentum >= 0.105) return "rising";
  if (momentum < 0.032) return "fading";
  return "steady";
}

/** Number of results after the precision cut is applied to the signal cap. */
export function precisionLimit(limit: number, precision: number): number {
  const p = clamp(precision, 0, 100) / 100;
  return Math.max(6, Math.min(limit, Math.round(limit * (1 - p * 0.55))));
}

export function formatFromDuration(seconds: number): "short" | "long" {
  return seconds > 0 && seconds <= 60 ? "short" : "long";
}
