import { NextResponse } from "next/server";
import { analyze } from "@/lib/analytics/analyze";
import { CATEGORIES, DEFAULT_FILTERS, MAX_CATEGORIES, MAX_REGIONS, REGION_MAP } from "@/lib/constants";
import { buildDemoDataset } from "@/lib/demo";
import { recordLiveSnapshots } from "@/lib/history";
import { fetchLiveCharts, YouTubeError } from "@/lib/live";
import type { DataMode, DurationFilter, Filters, RawVideo, TimePoint } from "@/lib/types";
import { clamp, normalizeTerm, unique } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_MODES = new Set<DataMode>(["auto", "live", "demo"]);
const VALID_DURATIONS = new Set<DurationFilter>(["any", "short", "medium", "long"]);

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return unique(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean));
  }
  if (typeof value === "string") {
    return unique(value.split(",").map((item) => item.trim()).filter(Boolean));
  }
  return [];
}

function parseKeywords(value: unknown, max: number): string[] {
  return parseStringArray(value)
    .map((term) => normalizeTerm(term).slice(0, 48))
    .filter(Boolean)
    .slice(0, max);
}

function numberOr(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return clamp(parsed, min, max);
}

function normalizeFilters(payload: unknown): Filters {
  const input =
    payload && typeof payload === "object"
      ? ((payload as Record<string, unknown>).filters as Record<string, unknown> | undefined) ??
        (payload as Record<string, unknown>)
      : {};

  const regions = unique(
    parseStringArray(input.regions)
      .map((region) => region.toUpperCase())
      .filter((region) => REGION_MAP.has(region))
  ).slice(0, MAX_REGIONS);

  const validCategories = new Set(CATEGORIES.map((category) => category.id));
  const categories = unique(parseStringArray(input.categories).filter((id) => validCategories.has(id))).slice(
    0,
    MAX_CATEGORIES
  );

  const modeValue = typeof input.mode === "string" ? (input.mode as DataMode) : "auto";
  const durationValue =
    typeof input.duration === "string" ? (input.duration as DurationFilter) : "any";

  return {
    regions: regions.length ? regions : [...DEFAULT_FILTERS.regions],
    categories,
    precision: Math.round(numberOr(input.precision, DEFAULT_FILTERS.precision, 0, 100)),
    includeKeywords: parseKeywords(input.includeKeywords, 5),
    excludeKeywords: parseKeywords(input.excludeKeywords, 10),
    minViews: Math.round(numberOr(input.minViews, DEFAULT_FILTERS.minViews, 0, 1_000_000_000)),
    maxAgeDays: Math.round(numberOr(input.maxAgeDays, DEFAULT_FILTERS.maxAgeDays, 1, 365)),
    duration: VALID_DURATIONS.has(durationValue) ? durationValue : "any",
    limit: Math.round(numberOr(input.limit, DEFAULT_FILTERS.limit, 6, 60)),
    mode: VALID_MODES.has(modeValue) ? modeValue : "auto"
  };
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    modelVersion: "TrendLens Signal Engine 1.3",
    serverKeyConfigured: Boolean(process.env.YOUTUBE_API_KEY),
    regions: REGION_MAP.size,
    categories: CATEGORIES.length
  });
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  let filters: Filters;

  try {
    const body = await request.json();
    filters = normalizeFilters(body);
  } catch {
    filters = { ...DEFAULT_FILTERS };
  }

  const headerKey = request.headers.get("x-youtube-key")?.trim() ?? "";
  const apiKey = headerKey || process.env.YOUTUBE_API_KEY?.trim() || "";
  const wantsLive = filters.mode === "live" || (filters.mode === "auto" && Boolean(apiKey));

  let videos: RawVideo[] = [];
  let histories: Record<string, TimePoint[]> = {};
  let source: "live" | "demo" = "demo";
  let warning: string | null = null;
  let cached = false;
  let apiCalls = 0;

  if (wantsLive && apiKey) {
    try {
      const live = await fetchLiveCharts(filters.regions, filters.categories, apiKey);
      if (!live.videos.length) {
        throw new YouTubeError(
          "YouTube returned no chart data for this region and category combination. Try a broader category selection."
        );
      }
      source = "live";
      videos = live.videos;
      apiCalls = live.apiCalls;
      cached = live.cached;
      histories = await recordLiveSnapshots(live.videos);
    } catch (error) {
      const message =
        error instanceof YouTubeError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Unknown YouTube API error.";
      warning = `Live data unavailable: ${message} Showing the demo dataset so you can keep exploring.`;
      const demo = buildDemoDataset(filters.regions);
      videos = demo.videos;
      histories = demo.histories;
      source = "demo";
    }
  } else {
    if (filters.mode === "live" && !apiKey) {
      warning = "Live mode was requested but no YouTube API key is configured. Add a key in Data Sources.";
    }
    const demo = buildDemoDataset(filters.regions);
    videos = demo.videos;
    histories = demo.histories;
    source = "demo";
  }

  const result = analyze(videos, histories, filters, {
    source,
    warning,
    cached,
    apiCalls,
    note: null
  });

  result.meta.durationMs = Date.now() - startedAt;

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
