import { describe, expect, it } from "vitest";
import { analyze } from "@/lib/analytics/analyze";
import { forecastFrom, momentumFromHistory } from "@/lib/analytics/forecast";
import { buildDemoDataset } from "@/lib/demo";
import { DEFAULT_FILTERS } from "@/lib/constants";
import type { Filters, TimePoint } from "@/lib/types";

const NOW = Date.UTC(2026, 9, 30, 12, 0, 0);

function analyzeDemo(overrides: Partial<Filters> = {}) {
  const filters: Filters = { ...DEFAULT_FILTERS, ...overrides };
  const demo = buildDemoDataset(filters.regions, NOW);
  return analyze(demo.videos, demo.histories, filters, {
    source: "demo",
    warning: null,
    cached: false,
    apiCalls: 0,
    now: NOW
  });
}

describe("demo dataset", () => {
  it("is deterministic for a given day", () => {
    const first = buildDemoDataset(["US", "GB", "IN"], NOW);
    const second = buildDemoDataset(["US", "GB", "IN"], NOW);
    expect(first.videos.map((video) => video.id).sort()).toEqual(
      second.videos.map((video) => video.id).sort()
    );
    expect(first.videos.length).toBeGreaterThan(100);
  });

  it("flags every video into at least one selected region and provides history", () => {
    const dataset = buildDemoDataset(["US", "BR", "JP"], NOW);
    for (const video of dataset.videos) {
      expect(video.regionCodes.length).toBeGreaterThan(0);
      expect(video.regionCodes.every((code) => ["US", "BR", "JP"].includes(code))).toBe(true);
      expect(dataset.histories[video.id]?.length ?? 0).toBeGreaterThanOrEqual(4);
    }
  });

  it("produces cross-region overlap", () => {
    const dataset = buildDemoDataset(["US", "GB", "IN", "BR", "JP", "DE"], NOW);
    expect(dataset.videos.some((video) => video.regionCodes.length >= 2)).toBe(true);
  });
});

describe("analysis pipeline", () => {
  it("returns scored videos, forecasts, keywords and ideas", () => {
    const result = analyzeDemo();
    expect(result.videos.length).toBeGreaterThan(5);
    expect(result.videos.length).toBeLessThanOrEqual(DEFAULT_FILTERS.limit);
    for (const video of result.videos) {
      expect(video.trendScore).toBeGreaterThanOrEqual(0);
      expect(video.trendScore).toBeLessThanOrEqual(100);
      expect(video.forecasts).toHaveLength(3);
      for (const forecast of video.forecasts) {
        expect(forecast.predictedViews).toBeGreaterThanOrEqual(Math.round(video.views));
        expect(forecast.low).toBeLessThanOrEqual(forecast.predictedViews);
        expect(forecast.high).toBeGreaterThanOrEqual(forecast.predictedViews);
      }
    }
    expect(result.insights.keywords.length).toBeGreaterThan(0);
    expect(result.insights.suggestions.length).toBeGreaterThan(0);
    expect(result.insights.categories.length).toBeGreaterThan(0);
    expect(result.insights.regions.length).toBe(DEFAULT_FILTERS.regions.length);
    expect(result.insights.matrix.length).toBeGreaterThan(0);
    expect(result.insights.timing.length).toBe(56);
    expect(result.insights.forecastSummary.backtest.sampleSize).toBeGreaterThan(0);
  });

  it("sorts results by trend score and assigns ranks", () => {
    const result = analyzeDemo();
    for (let index = 1; index < result.videos.length; index += 1) {
      expect(result.videos[index - 1].trendScore).toBeGreaterThanOrEqual(result.videos[index].trendScore);
      expect(result.videos[index].rank).toBe(index + 1);
    }
  });

  it("tightens the signal list as precision increases", () => {
    const lenient = analyzeDemo({ precision: 10, limit: 30 });
    const strict = analyzeDemo({ precision: 95, limit: 30 });
    expect(strict.videos.length).toBeLessThan(lenient.videos.length);
  });

  it("respects explicit category filters", () => {
    const result = analyzeDemo({ categories: ["10"] });
    expect(result.videos.length).toBeGreaterThan(0);
    expect(result.videos.every((video) => video.categoryId === "10")).toBe(true);
  });

  it("honours exclude keywords and min views", () => {
    const result = analyzeDemo({ minViews: 2_000_000, maxAgeDays: 20 });
    expect(result.videos.every((video) => video.views >= 2_000_000)).toBe(true);
    expect(result.videos.every((video) => video.ageDays <= 20.01)).toBe(true);
  });

  it("falls back gracefully when there are no matches", () => {
    const noData = analyze([], {}, { ...DEFAULT_FILTERS, includeKeywords: [] }, {
      source: "demo",
      warning: null,
      cached: false,
      apiCalls: 0,
      now: NOW
    });
    expect(noData.videos).toHaveLength(0);
    expect(noData.insights.suggestions).toHaveLength(0);
    expect(noData.meta.matched).toBe(0);
  });
});

describe("forecast model", () => {
  it("never projects below current cumulative views", () => {
    const forecast = forecastFrom(1_000_000, -0.05, 30, "low");
    expect(forecast.predictedViews).toBeGreaterThanOrEqual(1_000_000);
    expect(forecast.low).toBeGreaterThanOrEqual(1_000_000);
  });

  it("uses history to infer positive momentum", () => {
    const points: TimePoint[] = Array.from({ length: 8 }, (_, index) => {
      const views = Math.round(100_000 * Math.exp(0.2 * index));
      return { t: NOW - (7 - index) * 86_400_000, views, likes: views * 0.04, comments: views * 0.003 };
    });
    const { momentum, acceleration } = momentumFromHistory(points);
    expect(momentum).not.toBeNull();
    expect(momentum!).toBeGreaterThan(0.15);
    expect(acceleration).toBeGreaterThanOrEqual(-0.8);
  });

  it("keeps strong signals differentiated and applies the confidence haircut", () => {
    const strongHigh = forecastFrom(1_000_000, 0.6, 7, "high");
    const moderateHigh = forecastFrom(1_000_000, 0.35, 7, "high");
    const strongMedium = forecastFrom(1_000_000, 0.6, 7, "medium");
    const strongLow = forecastFrom(1_000_000, 0.6, 7, "low");

    expect(strongHigh.predictedViews).toBeGreaterThan(moderateHigh.predictedViews);
    expect(strongHigh.predictedViews).toBeGreaterThan(strongMedium.predictedViews);
    expect(strongMedium.predictedViews).toBeGreaterThan(strongLow.predictedViews);
  });
});
