export type DataMode = "auto" | "live" | "demo";
export type DurationFilter = "any" | "short" | "medium" | "long";
export type Trajectory = "rising" | "steady" | "spike" | "fading";
export type Confidence = "high" | "medium" | "low";
export type Direction = "rising" | "steady" | "cooling";

export interface Filters {
  regions: string[];
  /** Empty means every category. */
  categories: string[];
  /** 0 = exploratory, 100 = surgical. */
  precision: number;
  includeKeywords: string[];
  excludeKeywords: string[];
  minViews: number;
  maxAgeDays: number;
  duration: DurationFilter;
  limit: number;
  mode: DataMode;
}

export interface TimePoint {
  t: number;
  views: number;
  likes: number;
  comments: number;
}

export interface RawVideo {
  id: string;
  title: string;
  description: string;
  channelId: string;
  channelTitle: string;
  categoryId: string;
  tags: string[];
  publishedAt: string;
  durationSeconds: number;
  views: number;
  likes: number;
  comments: number;
  thumbnail: string | null;
  language: string | null;
  regionCodes: string[];
  source: "live" | "demo";
  /** Known trajectory for the synthetic dataset. Live data is inferred. */
  archetype?: Trajectory;
}

export interface ScoreBreakdown {
  velocity: number;
  momentum: number;
  engagement: number;
  freshness: number;
  reach: number;
  relevance: number;
}

export interface Forecast {
  horizonDays: number;
  predictedViews: number;
  low: number;
  high: number;
  growthRatePerDay: number;
  confidence: Confidence;
}

export interface TrendVideo extends RawVideo {
  regions: string[];
  ageDays: number;
  viewsPerDay: number;
  engagementRate: number;
  likeRate: number;
  commentRate: number;
  format: "short" | "long";
  history: TimePoint[];
  dataPoints: number;
  momentum: number;
  acceleration: number;
  trajectory: Trajectory;
  crossRegionCount: number;
  scores: ScoreBreakdown;
  trendScore: number;
  rank: number;
  breakoutProbability: number;
  forecasts: Forecast[];
  matchedKeywords: string[];
  topic: string;
}

export interface KeywordInsight {
  term: string;
  count: number;
  share: number;
  avgScore: number;
  avgMomentum: number;
  direction: Direction;
  regionSpread: number;
  shareOfVoice: number;
  totalViewsPerDay: number;
  opportunity: number;
  categoryId: string;
  categoryName: string;
  topVideoId: string;
}

export interface CategoryInsight {
  categoryId: string;
  name: string;
  color: string;
  count: number;
  share: number;
  avgScore: number;
  viewsPerDay: number;
  momentum: number;
  shortShare: number;
}

export interface RegionInsight {
  code: string;
  name: string;
  count: number;
  avgScore: number;
  medianViewsPerDay: number;
  avgEngagement: number;
  breakoutCount: number;
  topCategoryId: string;
  topCategoryName: string;
  topVideoId: string;
  topVideoTitle: string;
  opportunity: number;
}

export interface HeatmapCell {
  region: string;
  regionName: string;
  categoryId: string;
  categoryName: string;
  score: number;
  count: number;
  viewsPerDay: number;
}

export interface TimingCell {
  day: number;
  dayLabel: string;
  hourBlock: number;
  hourLabel: string;
  count: number;
  avgScore: number;
  avgViewsPerDay: number;
}

export interface Suggestion {
  id: string;
  title: string;
  angle: string;
  hook: string;
  format: "Short" | "Long-form";
  targetRegion: string;
  targetRegionName: string;
  targetCategory: string;
  targetCategoryId: string;
  keywords: string[];
  hashtags: string[];
  opportunity: number;
  confidence: number;
  rationale: string;
  estimatedViewsLow: number;
  estimatedViewsHigh: number;
}

export interface OverlapInsight {
  id: string;
  title: string;
  regions: string[];
  trendScore: number;
  views: number;
  categoryName: string;
}

export interface Summary {
  analyzed: number;
  fetched: number;
  regions: number;
  categories: number;
  avgTrendScore: number;
  medianEngagement: number;
  totalViews: number;
  totalViewsPerDay: number;
  breakoutCount: number;
  risingKeywords: number;
  topCategory: string;
  topCategoryId: string;
  topRegion: string;
  topRegionName: string;
  medianAgeDays: number;
  shortShare: number;
  multiRegionCount: number;
  signalRate: number;
}

export interface Backtest {
  mape: number | null;
  medianError: number | null;
  sampleSize: number;
  method: string;
}

export interface ForecastSummary {
  backtest: Backtest;
  calibration: { scale: number; evaluated: number };
  breakoutCandidates: number;
  medianGrowth: number;
  confidenceMix: { high: number; medium: number; low: number };
  expected7dViews: number;
  topForecastId: string | null;
}

export interface Insights {
  summary: Summary;
  categories: CategoryInsight[];
  regions: RegionInsight[];
  matrix: HeatmapCell[];
  keywords: KeywordInsight[];
  suggestions: Suggestion[];
  timing: TimingCell[];
  overlaps: OverlapInsight[];
  forecastSummary: ForecastSummary;
}

export interface Meta {
  generatedAt: string;
  source: "live" | "demo";
  warning: string | null;
  note: string | null;
  cached: boolean;
  durationMs: number;
  fetched: number;
  filtered: number;
  matched: number;
  gateThreshold: number;
  precision: number;
  weights: ScoreBreakdown;
  modelVersion: string;
  regions: string[];
  categories: string[];
  apiCalls: number;
}

export interface AnalysisResult {
  videos: TrendVideo[];
  insights: Insights;
  meta: Meta;
}

export interface TimingWindow {
  dayLabel: string;
  hourLabel: string;
  score: number;
  count: number;
}

export interface ApiError {
  error: string;
  detail?: string;
}
