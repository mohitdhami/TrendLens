import { CATEGORY_MAP, categoryName, regionName } from "../constants";
import type {
  AnalysisResult,
  CategoryInsight,
  Filters,
  ForecastSummary,
  HeatmapCell,
  Insights,
  KeywordInsight,
  Meta,
  RawVideo,
  RegionInsight,
  Summary,
  TimePoint,
  TimingCell,
  TrendVideo
} from "../types";
import {
  clamp,
  daysSince,
  mean,
  median,
  normalizeTerm,
  percentileRanks,
  round,
  unique
} from "../utils";
import { buildForecasts, calibrateForecast, confidenceFromHistory, momentumFromHistory } from "./forecast";
import { extractKeywords } from "./keywords";
import {
  breakoutProbability,
  formatFromDuration,
  heuristicMomentum,
  inferTrajectory,
  precisionLimit,
  trendScoreFrom,
  weightsFor
} from "./score";
import { buildSuggestions } from "./suggestions";

interface AnalyzeContext {
  source: "live" | "demo";
  warning: string | null;
  cached: boolean;
  apiCalls: number;
  note?: string | null;
  now?: number;
}

interface Draft extends TrendVideo {
  rawMomentum: number | null;
}

function mergeRaw(videos: RawVideo[]): RawVideo[] {
  const map = new Map<string, RawVideo>();
  for (const video of videos) {
    const existing = map.get(video.id);
    if (!existing) {
      map.set(video.id, { ...video, regionCodes: unique(video.regionCodes), tags: unique(video.tags) });
      continue;
    }
    existing.regionCodes = unique([...existing.regionCodes, ...video.regionCodes]);
    existing.tags = unique([...existing.tags, ...video.tags]);
    if (video.views > existing.views) {
      existing.views = video.views;
      existing.likes = video.likes;
      existing.comments = video.comments;
      existing.publishedAt = video.publishedAt;
    }
  }
  return [...map.values()];
}

function haystack(video: RawVideo): string {
  return `${video.title} ${video.tags.join(" ")} ${video.description}`.toLowerCase();
}

function matchesFocus(video: RawVideo, terms: string[]): boolean {
  if (!terms.length) return false;
  const text = haystack(video);
  return terms.some((term) => text.includes(term));
}

function relevanceFor(video: RawVideo, terms: string[]): number {
  if (!terms.length) return 50;
  const title = video.title.toLowerCase();
  const tags = video.tags.join(" ").toLowerCase();
  const description = video.description.toLowerCase();
  let score = 0;
  for (const term of terms) {
    if (title.includes(term)) score += 45;
    else if (tags.includes(term)) score += 32;
    else if (description.includes(term)) score += 16;
  }
  return clamp(score, 0, 100);
}

function emptyInsights(): Insights {
  return {
    summary: {
      analyzed: 0,
      fetched: 0,
      regions: 0,
      categories: 0,
      avgTrendScore: 0,
      medianEngagement: 0,
      totalViews: 0,
      totalViewsPerDay: 0,
      breakoutCount: 0,
      risingKeywords: 0,
      topCategory: "—",
      topCategoryId: "",
      topRegion: "",
      topRegionName: "—",
      medianAgeDays: 0,
      shortShare: 0,
      multiRegionCount: 0,
      signalRate: 0
    },
    categories: [],
    regions: [],
    matrix: [],
    keywords: [],
    suggestions: [],
    timing: [],
    overlaps: [],
    forecastSummary: {
      backtest: { mape: null, medianError: null, sampleSize: 0, method: "Walk-forward holdout · damped momentum" },
      calibration: { scale: 0.3, evaluated: 0 },
      breakoutCandidates: 0,
      medianGrowth: 0,
      confidenceMix: { high: 0, medium: 0, low: 0 },
      expected7dViews: 0,
      topForecastId: null
    }
  };
}

function buildMetaBase(
  filters: Filters,
  context: AnalyzeContext,
  weights: ReturnType<typeof weightsFor>
): Meta {
  return {
    generatedAt: new Date(context.now ?? Date.now()).toISOString(),
    source: context.source,
    warning: context.warning,
    note: context.note ?? null,
    cached: context.cached,
    durationMs: 0,
    fetched: 0,
    filtered: 0,
    matched: 0,
    gateThreshold: 0,
    precision: filters.precision,
    weights,
    modelVersion: "TrendLens Signal Engine 1.3",
    regions: filters.regions,
    categories: filters.categories,
    apiCalls: context.apiCalls
  };
}

export function analyze(
  rawVideos: RawVideo[],
  histories: Record<string, TimePoint[]>,
  filters: Filters,
  context: AnalyzeContext
): AnalysisResult {
  const startedAt = Date.now();
  const now = context.now ?? Date.now();
  const merged = mergeRaw(rawVideos);
  const focusTerms = filters.includeKeywords.map(normalizeTerm).filter(Boolean);
  const excludeTerms = filters.excludeKeywords.map(normalizeTerm).filter(Boolean);
  const categorySet = new Set(filters.categories);
  const weights = weightsFor(filters.precision, focusTerms.length > 0);

  const hardFiltered = merged.filter((video) => {
    if (categorySet.size > 0 && !categorySet.has(video.categoryId)) return false;
    if (video.views < filters.minViews) return false;
    const age = daysSince(video.publishedAt, now);
    if (age > filters.maxAgeDays) return false;
    if (filters.duration === "short" && video.durationSeconds > 60) return false;
    if (filters.duration === "medium" && (video.durationSeconds <= 60 || video.durationSeconds > 480)) return false;
    if (filters.duration === "long" && video.durationSeconds <= 480) return false;
    if (excludeTerms.length && excludeTerms.some((term) => haystack(video).includes(term))) return false;
    return true;
  });

  const notes: string[] = [];
  if (context.note) notes.push(context.note);

  let filtered = hardFiltered;
  if (focusTerms.length) {
    const focused = hardFiltered.filter((video) => matchesFocus(video, focusTerms));
    if (focused.length >= 5) {
      filtered = focused;
    } else {
      filtered = hardFiltered;
      notes.push(
        `Focus keywords only matched ${focused.length} signal${focused.length === 1 ? "" : "s"}; showing the closest set with relevance weighting instead.`
      );
    }
  }

  const meta = buildMetaBase(filters, context, weights);
  meta.note = notes.length ? notes.join(" ") : null;
  meta.fetched = merged.length;
  meta.filtered = filtered.length;

  if (!filtered.length) {
    const result: AnalysisResult = {
      videos: [],
      insights: emptyInsights(),
      meta: {
        ...meta,
        matched: 0,
        durationMs: Date.now() - startedAt
      }
    };
    return result;
  }

  const maxReach = Math.max(1, ...filtered.map((video) => video.regionCodes.length));

  const drafts: Draft[] = filtered.map((video) => {
    const ageDays = Math.max(0.05, daysSince(video.publishedAt, now));
    const history = [...(histories[video.id] ?? [])].sort((a, b) => a.t - b.t).slice(-30);
    const fallbackHistory: TimePoint[] =
      history.length > 0
        ? history
        : [
            {
              t: now,
              views: video.views,
              likes: video.likes,
              comments: video.comments
            }
          ];
    const momentum = momentumFromHistory(fallbackHistory);
    const engagementRate =
      video.views > 0 ? ((video.likes + video.comments * 4) / video.views) * 100 : 0;
    const likeRate = video.views > 0 ? (video.likes / video.views) * 100 : 0;
    const commentRate = video.views > 0 ? (video.comments / video.views) * 100 : 0;
    const regions = unique(video.regionCodes);

    return {
      ...video,
      regions,
      ageDays,
      viewsPerDay: video.views / Math.max(0.3, ageDays),
      engagementRate,
      likeRate,
      commentRate,
      format: formatFromDuration(video.durationSeconds),
      history: fallbackHistory,
      dataPoints: fallbackHistory.length,
      momentum: momentum.momentum ?? 0,
      rawMomentum: momentum.momentum,
      acceleration: momentum.acceleration,
      trajectory: "steady",
      crossRegionCount: regions.length,
      scores: { velocity: 0, momentum: 0, engagement: 0, freshness: 0, reach: 0, relevance: 0 },
      trendScore: 0,
      rank: 0,
      breakoutProbability: 0,
      forecasts: [],
      matchedKeywords: focusTerms.filter((term) => haystack(video).includes(term)),
      topic: video.tags[0] ?? video.title.split(" ").slice(0, 2).join(" "),
      views: Math.round(video.views),
      likes: Math.round(video.likes),
      comments: Math.round(video.comments)
    };
  });

  const velocityRanks = percentileRanks(drafts.map((video) => Math.log1p(video.viewsPerDay)));
  const engagementRanks = percentileRanks(drafts.map((video) => video.engagementRate));

  drafts.forEach((video, index) => {
    const estimated =
      video.rawMomentum === null
        ? heuristicMomentum(velocityRanks[index], engagementRanks[index], video.ageDays)
        : video.rawMomentum;
    video.momentum = estimated;
    video.scores.velocity = velocityRanks[index];
    video.scores.engagement = engagementRanks[index];
    video.scores.freshness = clamp(100 * Math.exp(-video.ageDays / 10), 0, 100);
    video.scores.reach = clamp((video.crossRegionCount / maxReach) * 100, 0, 100);
    video.scores.relevance = relevanceFor(video, focusTerms);
    video.trajectory = inferTrajectory(estimated, video.acceleration, video.archetype);
  });

  const momentumRanks = percentileRanks(drafts.map((video) => video.momentum));
  drafts.forEach((video, index) => {
    video.scores.momentum = momentumRanks[index];
    video.scores.freshness = round(video.scores.freshness, 1);
    video.scores.reach = round(video.scores.reach, 1);
    video.scores.relevance = round(video.scores.relevance, 1);
    video.trendScore = trendScoreFrom(video.scores, weights, filters.precision);
    video.breakoutProbability = breakoutProbability(video.scores);
  });

  const ranked = [...drafts].sort(
    (a, b) => b.trendScore - a.trendScore || b.momentum - a.momentum
  );
  const effectiveLimit = Math.min(
    filters.limit,
    precisionLimit(filters.limit, filters.precision)
  );
  const matched = ranked.slice(0, effectiveLimit);
  const calibration = calibrateForecast(histories);

  matched.forEach((video, index) => {
    video.rank = index + 1;
    const confidence = confidenceFromHistory(video.history);
    video.forecasts = buildForecasts(
      video.views,
      video.momentum,
      confidence,
      [7, 30, 90],
      calibration.scale
    );
  });

  const categories: CategoryInsight[] = (() => {
    const groups = new Map<string, TrendVideo[]>();
    for (const video of matched) {
      const list = groups.get(video.categoryId) ?? [];
      list.push(video);
      groups.set(video.categoryId, list);
    }
    return [...groups.entries()]
      .map(([categoryId, videos]) => {
        const info = CATEGORY_MAP.get(categoryId);
        return {
          categoryId,
          name: info?.name ?? categoryName(categoryId),
          color: info?.color ?? "#8b9bb0",
          count: videos.length,
          share: round((videos.length / matched.length) * 100, 1),
          avgScore: round(mean(videos.map((video) => video.trendScore)), 1),
          viewsPerDay: Math.round(videos.reduce((sum, video) => sum + video.viewsPerDay, 0)),
          momentum: round(mean(videos.map((video) => video.momentum)), 4),
          shortShare: round(
            (videos.filter((video) => video.format === "short").length / videos.length) * 100,
            0
          )
        };
      })
      .sort((a, b) => b.avgScore - a.avgScore);
  })();

  const regionInsights: RegionInsight[] = (() => {
    const regionCodes = filters.regions.length
      ? filters.regions
      : unique(drafts.flatMap((video) => video.regions));
    const rows = regionCodes
      .map((code) => {
        const list = drafts.filter((video) => video.regions.includes(code));
        if (!list.length) return null;
        const counts = new Map<string, number>();
        for (const video of list) counts.set(video.categoryId, (counts.get(video.categoryId) ?? 0) + 1);
        const topCategoryId = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
        const topVideo = [...list].sort((a, b) => b.trendScore - a.trendScore)[0];
        return {
          code,
          name: regionName(code),
          count: list.length,
          avgScore: mean(list.map((video) => video.trendScore)),
          medianViewsPerDay: median(list.map((video) => video.viewsPerDay)),
          avgEngagement: mean(list.map((video) => video.engagementRate)),
          breakoutCount: list.filter((video) => video.breakoutProbability >= 0.6).length,
          topCategoryId,
          topCategoryName: categoryName(topCategoryId),
          topVideoId: topVideo.id,
          topVideoTitle: topVideo.title,
          opportunity: 0
        };
      })
      .filter((row): row is RegionInsight => row !== null);

    const scoreRanks = percentileRanks(rows.map((row) => row.avgScore));
    const breakoutRates = percentileRanks(
      rows.map((row) => (row.count ? row.breakoutCount / row.count : 0))
    );
    const countRanks = percentileRanks(rows.map((row) => row.count));

    rows.forEach((row, index) => {
      row.opportunity = round(
        clamp(scoreRanks[index] * 0.58 + breakoutRates[index] * 0.27 + (100 - countRanks[index]) * 0.15, 0, 100),
        1
      );
      row.avgScore = round(row.avgScore, 1);
      row.medianViewsPerDay = Math.round(row.medianViewsPerDay);
      row.avgEngagement = round(row.avgEngagement, 2);
    });

    return rows.sort((a, b) => b.opportunity - a.opportunity);
  })();

  const matrix: HeatmapCell[] = (() => {
    const categoryIds = unique(drafts.map((video) => video.categoryId));
    const rows: HeatmapCell[] = [];
    for (const region of filters.regions) {
      for (const categoryId of categoryIds) {
        const list = drafts.filter(
          (video) => video.regions.includes(region) && video.categoryId === categoryId
        );
        if (!list.length) continue;
        rows.push({
          region,
          regionName: regionName(region),
          categoryId,
          categoryName: categoryName(categoryId),
          score: round(mean(list.map((video) => video.trendScore)), 1),
          count: list.length,
          viewsPerDay: Math.round(list.reduce((sum, video) => sum + video.viewsPerDay, 0))
        });
      }
    }
    return rows;
  })();

  const keywords: KeywordInsight[] = extractKeywords(matched, focusTerms, 18);

  const timing: TimingCell[] = (() => {
    const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const cells: TimingCell[] = [];
    for (let day = 0; day < 7; day += 1) {
      for (let block = 0; block < 8; block += 1) {
        const list = drafts.filter((video) => {
          const date = new Date(video.publishedAt);
          return date.getUTCDay() === day && Math.floor(date.getUTCHours() / 3) === block;
        });
        cells.push({
          day,
          dayLabel: dayLabels[day],
          hourBlock: block,
          hourLabel: `${String(block * 3).padStart(2, "0")}–${String(block * 3 + 3).padStart(2, "0")}`,
          count: list.length,
          avgScore: list.length ? round(mean(list.map((video) => video.trendScore)), 1) : 0,
          avgViewsPerDay: list.length
            ? Math.round(mean(list.map((video) => video.viewsPerDay)))
            : 0
        });
      }
    }
    return cells;
  })();

  const summary: Summary = (() => {
    const regionCounts = new Map<string, number>();
    for (const video of matched) {
      for (const region of video.regions) {
        regionCounts.set(region, (regionCounts.get(region) ?? 0) + 1);
      }
    }
    const topRegionCode =
      [...regionCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? filters.regions[0] ?? "US";
    return {
      analyzed: matched.length,
      fetched: merged.length,
      regions: filters.regions.length || unique(drafts.flatMap((video) => video.regions)).length,
      categories: unique(matched.map((video) => video.categoryId)).length,
      avgTrendScore: round(mean(matched.map((video) => video.trendScore)), 1),
      medianEngagement: round(median(matched.map((video) => video.engagementRate)), 2),
      totalViews: matched.reduce((sum, video) => sum + video.views, 0),
      totalViewsPerDay: Math.round(matched.reduce((sum, video) => sum + video.viewsPerDay, 0)),
      breakoutCount: matched.filter((video) => video.breakoutProbability >= 0.6).length,
      risingKeywords: keywords.filter((keyword) => keyword.direction === "rising").length,
      topCategory: categories[0]?.name ?? "—",
      topCategoryId: categories[0]?.categoryId ?? "",
      topRegion: topRegionCode,
      topRegionName: regionName(topRegionCode),
      medianAgeDays: round(median(matched.map((video) => video.ageDays)), 1),
      shortShare: round(
        (matched.filter((video) => video.format === "short").length / matched.length) * 100,
        0
      ),
      multiRegionCount: matched.filter((video) => video.regions.length >= 2).length,
      signalRate: filtered.length ? round((matched.length / filtered.length) * 100, 1) : 0
    };
  })();

  const overlaps = matched
    .filter((video) => video.regions.length >= 2)
    .sort((a, b) => b.regions.length - a.regions.length || b.trendScore - a.trendScore)
    .slice(0, 12)
    .map((video) => ({
      id: video.id,
      title: video.title,
      regions: video.regions,
      trendScore: video.trendScore,
      views: video.views,
      categoryName: categoryName(video.categoryId)
    }));

  const forecastSummary: ForecastSummary = (() => {
    const confidenceMix = { high: 0, medium: 0, low: 0 };
    for (const video of matched) confidenceMix[confidenceFromHistory(video.history)] += 1;
    const expected7dViews = matched.reduce((sum, video) => {
      const forecast = video.forecasts.find((item) => item.horizonDays === 7);
      return sum + (forecast?.predictedViews ?? video.views);
    }, 0);
    const top = [...matched].sort((a, b) => b.breakoutProbability - a.breakoutProbability)[0];
    return {
      backtest: calibration.backtest,
      calibration: { scale: calibration.scale, evaluated: calibration.evaluated },
      breakoutCandidates: matched.filter((video) => video.breakoutProbability >= 0.6).length,
      medianGrowth: round(median(matched.map((video) => video.momentum)), 4),
      confidenceMix,
      expected7dViews,
      topForecastId: top?.id ?? null
    };
  })();

  const suggestions = buildSuggestions({
    videos: matched,
    keywords,
    categories,
    regions: regionInsights
  });

  const insights: Insights = {
    summary,
    categories,
    regions: regionInsights,
    matrix,
    keywords,
    suggestions,
    timing,
    overlaps,
    forecastSummary
  };

  const selectedRegions = filters.regions;
  const selectedCategories = filters.categories;

  return {
    videos: matched,
    insights,
    meta: {
      ...meta,
      matched: matched.length,
      gateThreshold: filtered.length
        ? round(((filtered.length - matched.length) / filtered.length) * 100, 1)
        : 0,
      durationMs: Date.now() - startedAt,
      regions: selectedRegions,
      categories: selectedCategories
    }
  };
}
