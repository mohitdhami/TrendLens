import type { Backtest, Confidence, Forecast, TimePoint } from "../types";
import { clamp, logGrowth, mean, median } from "../utils";

export interface MomentumResult {
  momentum: number | null;
  acceleration: number;
}

const DEFAULT_SCALE = 0.3;
const SCALE_GRID = [0.18, 0.26, 0.34, 0.44, 0.56, 0.7, 0.9];

/**
 * Computes a robust daily growth rate from cumulative view snapshots.
 * Recent growth is measured over a rolling window (capped at 3.5 days) so a
 * young video isn't misclassified by its entire birth curve.
 */
export function momentumFromHistory(points: TimePoint[]): MomentumResult {
  const sorted = [...points].sort((a, b) => a.t - b.t);
  if (sorted.length < 2) return { momentum: null, acceleration: 0 };

  const spanDays = (sorted[sorted.length - 1].t - sorted[0].t) / 86_400_000;
  const recentWindow = Math.min(3.5, Math.max(0.75, spanDays * 0.5));
  const recent = logGrowth(sorted, recentWindow);
  if (recent === null) return { momentum: null, acceleration: 0 };

  const start = sorted[0].t;
  const end = sorted[sorted.length - 1].t;
  const split = start + (end - start) * 0.55;
  const earlyPoints = sorted.filter((point) => point.t <= split);
  const early = earlyPoints.length >= 2 ? logGrowth(earlyPoints, 120) : null;
  const acceleration = early === null ? 0 : clamp(recent - early, -0.8, 0.8);

  return { momentum: clamp(recent, -0.08, 0.6), acceleration };
}

export function confidenceFromHistory(points: TimePoint[]): Confidence {
  if (points.length < 3) return "low";
  const spanDays = (points[points.length - 1].t - points[0].t) / 86_400_000;
  if (points.length >= 6 && spanDays >= 2) return "high";
  if (points.length >= 3 && spanDays >= 0.75) return "medium";
  return "low";
}

const CAP_BY_HORIZON: Record<number, number> = {
  7: 0.75,
  30: 1.35,
  90: 1.75
};

/**
 * Damped power-law momentum forecast. Growth is compressed as the horizon
 * extends, reflecting the natural deceleration of cumulative view curves.
 * `scale` is auto-calibrated against observed histories where available.
 */
export function forecastFrom(
  views: number,
  growthRatePerDay: number,
  horizonDays: number,
  confidence: Confidence,
  scale = DEFAULT_SCALE
): Forecast {
  const growth = clamp(growthRatePerDay, -0.08, 0.6);
  const cap = CAP_BY_HORIZON[horizonDays] ?? 0.75 + Math.log1p(horizonDays / 7) * 0.35;
  const confidenceHaircut = confidence === "high" ? 1 : confidence === "medium" ? 0.88 : 0.74;
  const rawLog = Math.pow(Math.max(growth, 0), 0.82) * Math.pow(horizonDays, 0.6) * scale;
  // Blend a hard ceiling with a soft one so strong signals keep a little
  // separation instead of all collapsing onto an identical "maxed out" number.
  const hardLog = Math.min(rawLog, cap);
  const softLog = cap * (1 - Math.exp(-rawLog / cap));
  const dampedLog = (hardLog * 0.75 + softLog * 0.25) * confidenceHaircut;
  const predicted = Math.max(views, Math.round(views * Math.exp(dampedLog)));
  const sigma = confidence === "high" ? 0.16 : confidence === "medium" ? 0.28 : 0.42;
  const interval = 1.2816 * sigma * Math.sqrt(Math.max(horizonDays, 1) / 7);
  const low = Math.max(views, Math.round(predicted * Math.exp(-interval)));
  const high = Math.max(low, Math.round(predicted * Math.exp(interval)));

  return {
    horizonDays,
    predictedViews: Math.round(predicted),
    low,
    high,
    growthRatePerDay: Number(growth.toFixed(4)),
    confidence
  };
}

export function buildForecasts(
  views: number,
  growthRatePerDay: number,
  confidence: Confidence,
  horizons: number[] = [7, 30, 90],
  scale = DEFAULT_SCALE
): Forecast[] {
  return horizons.map((horizon) => forecastFrom(views, growthRatePerDay, horizon, confidence, scale));
}

function holdoutErrors(histories: Record<string, TimePoint[]>, scale: number): number[] {
  const errors: number[] = [];

  for (const points of Object.values(histories)) {
    if (!points || points.length < 5) continue;
    const sorted = [...points].sort((a, b) => a.t - b.t);
    const spanDays = (sorted[sorted.length - 1].t - sorted[0].t) / 86_400_000;
    if (spanDays < 2) continue;

    const targetHorizon = clamp(spanDays * 0.55, 1, 7);
    const cutoff = sorted[sorted.length - 1].t - targetHorizon * 86_400_000;
    let train = sorted.filter((point) => point.t <= cutoff);
    if (train.length < 4) {
      train = sorted.slice(0, Math.max(3, Math.floor(sorted.length * 0.6)));
    }
    if (train.length >= sorted.length) continue;

    const actual = sorted[sorted.length - 1].views;
    const lastTrain = train[train.length - 1];
    if (!lastTrain || lastTrain.views <= 0 || actual <= 0) continue;

    const { momentum } = momentumFromHistory(train);
    if (momentum === null) continue;
    const horizonDays = Math.max((sorted[sorted.length - 1].t - lastTrain.t) / 86_400_000, 0.5);
    const prediction = forecastFrom(lastTrain.views, momentum, horizonDays, confidenceFromHistory(train), scale);
    const error = Math.abs(prediction.predictedViews - actual) / actual;
    if (Number.isFinite(error) && error < 10) errors.push(error);
  }

  return errors;
}

export function runBacktest(
  histories: Record<string, TimePoint[]>,
  scale = DEFAULT_SCALE
): Backtest {
  const errors = holdoutErrors(histories, scale);
  if (!errors.length) {
    return {
      mape: null,
      medianError: null,
      sampleSize: 0,
      method: "Walk-forward holdout · auto-calibrated damped momentum"
    };
  }

  return {
    mape: Number((mean(errors) * 100).toFixed(1)),
    medianError: Number((median(errors) * 100).toFixed(1)),
    sampleSize: errors.length,
    method: "Walk-forward holdout · auto-calibrated damped momentum"
  };
}

export interface ForecastCalibration {
  scale: number;
  backtest: Backtest;
  evaluated: number;
}

/**
 * Picks the damping scale that minimises holdout median error on the observed
 * snapshot history. Falls back to the conservative default with sparse data.
 */
export function calibrateForecast(histories: Record<string, TimePoint[]>): ForecastCalibration {
  let bestScale = DEFAULT_SCALE;
  let bestScore = Number.POSITIVE_INFINITY;
  let bestBacktest = runBacktest(histories, DEFAULT_SCALE);
  let evaluated = 0;

  for (const scale of SCALE_GRID) {
    const errors = holdoutErrors(histories, scale);
    if (errors.length < 5) continue;
    evaluated += 1;
    const score = median(errors);
    if (score < bestScore) {
      bestScore = score;
      bestScale = scale;
      bestBacktest = runBacktest(histories, scale);
    }
  }

  return { scale: bestScale, backtest: bestBacktest, evaluated };
}

export function forecastDelta(video: { views: number; forecasts: Forecast[] }, horizon = 7): number {
  const forecast = video.forecasts.find((item) => item.horizonDays === horizon);
  if (!forecast || video.views <= 0) return 0;
  return forecast.predictedViews / video.views - 1;
}
