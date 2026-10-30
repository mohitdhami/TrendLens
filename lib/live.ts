import type { RawVideo } from "./types";
import { parseISODuration, unique } from "./utils";

interface CachedChart {
  expires: number;
  items: RawVideo[];
}

const chartCache = new Map<string, CachedChart>();
const CACHE_TTL_MS = 20 * 60 * 1000;

export class YouTubeError extends Error {
  status: number;
  reason: string;

  constructor(message: string, status = 502, reason = "youtube_error") {
    super(message);
    this.name = "YouTubeError";
    this.status = status;
    this.reason = reason;
  }
}

interface ApiVideoItem {
  id: string;
  snippet?: {
    title?: string;
    description?: string;
    channelId?: string;
    channelTitle?: string;
    categoryId?: string;
    tags?: string[];
    publishedAt?: string;
    defaultAudioLanguage?: string;
    defaultLanguage?: string;
    thumbnails?: Record<string, { url?: string }>;
  };
  statistics?: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
  contentDetails?: {
    duration?: string;
  };
}

interface ChartResponse {
  items?: ApiVideoItem[];
  error?: {
    code?: number;
    message?: string;
    errors?: Array<{ reason?: string; message?: string }>;
  };
}

function normalizeItem(item: ApiVideoItem, region: string): RawVideo | null {
  if (!item.id || !item.snippet) return null;
  const snippet = item.snippet;
  const stats = item.statistics ?? {};
  const thumbnails = snippet.thumbnails ?? {};
  const thumbnail =
    thumbnails.maxres?.url ??
    thumbnails.standard?.url ??
    thumbnails.high?.url ??
    thumbnails.medium?.url ??
    thumbnails.default?.url ??
    null;

  return {
    id: item.id,
    title: snippet.title ?? "Untitled",
    description: (snippet.description ?? "").slice(0, 600),
    channelId: snippet.channelId ?? "",
    channelTitle: snippet.channelTitle ?? "Unknown channel",
    categoryId: snippet.categoryId ?? "0",
    tags: unique((snippet.tags ?? []).map((tag) => tag.trim()).filter(Boolean)).slice(0, 25),
    publishedAt: snippet.publishedAt ?? new Date().toISOString(),
    durationSeconds: parseISODuration(item.contentDetails?.duration ?? "PT0S"),
    views: Number(stats.viewCount ?? 0) || 0,
    likes: Number(stats.likeCount ?? 0) || 0,
    comments: Number(stats.commentCount ?? 0) || 0,
    thumbnail,
    language: snippet.defaultAudioLanguage ?? snippet.defaultLanguage ?? null,
    regionCodes: [region],
    source: "live"
  };
}

async function fetchChart(
  region: string,
  categoryId: string | null,
  apiKey: string
): Promise<{ videos: RawVideo[]; fromCache: boolean }> {
  const cacheKey = `${region}:${categoryId ?? "all"}`;
  const cached = chartCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return { videos: cached.items, fromCache: true };
  }

  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "snippet,statistics,contentDetails");
  url.searchParams.set("chart", "mostPopular");
  url.searchParams.set("regionCode", region);
  url.searchParams.set("maxResults", "50");
  url.searchParams.set("key", apiKey);
  if (categoryId) url.searchParams.set("videoCategoryId", categoryId);

  const response = await fetch(url.toString(), { cache: "no-store" });
  let payload: ChartResponse = {};
  try {
    payload = (await response.json()) as ChartResponse;
  } catch {
    // Non-JSON response.
  }

  if (!response.ok || payload.error) {
    const message =
      payload.error?.errors?.[0]?.message ??
      payload.error?.message ??
      `YouTube API returned ${response.status}.`;
    const reason = payload.error?.errors?.[0]?.reason ?? "youtube_error";

    if (response.status === 400 && /videoCategoryId|category/i.test(message)) {
      return { videos: [], fromCache: false };
    }
    if (reason === "quotaExceeded" || reason === "dailyLimitExceeded") {
      throw new YouTubeError(
        "The YouTube API quota for this key is exhausted. The demo dataset is shown instead. Quota resets daily at midnight Pacific time.",
        429,
        reason
      );
    }
    if (reason === "keyInvalid" || reason === "badRequest") {
      throw new YouTubeError(
        "The YouTube API key was rejected. Check that YouTube Data API v3 is enabled for the key and that it has no restrictive HTTP referrer limits.",
        response.status || 401,
        reason
      );
    }
    throw new YouTubeError(message, response.status || 502, reason);
  }

  const videos = (payload.items ?? [])
    .map((item) => normalizeItem(item, region))
    .filter((video): video is RawVideo => video !== null);

  chartCache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, items: videos });
  return { videos, fromCache: false };
}

export interface LiveFetchResult {
  videos: RawVideo[];
  apiCalls: number;
  cached: boolean;
}

/**
 * Pulls regional most-popular charts. Category selections fan out to one
 * request per category per region (max 4 categories enforced upstream).
 */
export async function fetchLiveCharts(
  regions: string[],
  categories: string[],
  apiKey: string
): Promise<LiveFetchResult> {
  const calls: Array<Promise<{ videos: RawVideo[]; fromCache: boolean }>> = [];

  for (const region of regions) {
    if (categories.length === 0) {
      calls.push(fetchChart(region, null, apiKey));
    } else {
      for (const categoryId of categories) {
        calls.push(fetchChart(region, categoryId, apiKey));
      }
    }
  }

  const settled = await Promise.all(calls);
  let apiCalls = 0;
  let cacheHits = 0;

  const merged = new Map<string, RawVideo>();
  for (const result of settled) {
    if (result.fromCache) cacheHits += 1;
    else apiCalls += 1;
    for (const video of result.videos) {
      const existing = merged.get(video.id);
      if (existing) {
        existing.regionCodes = unique([...existing.regionCodes, ...video.regionCodes]);
      } else {
        merged.set(video.id, { ...video, regionCodes: [...video.regionCodes] });
      }
    }
  }

  return {
    videos: [...merged.values()],
    apiCalls,
    cached: cacheHits === settled.length && settled.length > 0
  };
}
