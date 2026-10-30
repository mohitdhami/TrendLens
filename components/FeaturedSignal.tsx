"use client";

import { ArrowUpRight, Clock3, Flame, Play, Sparkles } from "lucide-react";
import { CATEGORY_MAP } from "@/lib/constants";
import { formatAge, formatCompact, formatGrowth, formatLift, formatPercent } from "@/lib/format";
import type { TrendVideo } from "@/lib/types";
import { ScoreRing, Sparkline } from "./charts";
import { Badge, RegionFlags, TrajectoryBadge } from "./ui";
import { VideoArtwork } from "./VideoArtwork";

export function FeaturedSignal({
  video,
  onOpen,
  onForecast
}: {
  video: TrendVideo;
  onOpen: (video: TrendVideo) => void;
  onForecast: (video: TrendVideo) => void;
}) {
  const forecast = video.forecasts.find((item) => item.horizonDays === 7);
  const category = CATEGORY_MAP.get(video.categoryId);
  const lift = forecast ? formatLift(video.views, forecast.predictedViews) : 0;

  return (
    <article className="panel relative overflow-hidden">
      <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-lime-400/60 to-transparent" />
      <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-lime-400/[0.08] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-mint-400/[0.05] blur-3xl" />
      <div className="relative grid gap-5 p-4 sm:p-5 md:grid-cols-[220px,1fr] xl:grid-cols-[280px,1fr]">
        <div className="flex flex-col gap-2.5">
          <VideoArtwork video={video} variant="feature" className="!rounded-xl" />
          <div className="flex items-center justify-between px-0.5">
            <span className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-fog-600">
              {video.source === "demo" ? "Synthetic signal feed" : "YouTube regional chart"}
            </span>
            <span className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-fog-600">
              #{String(video.rank).padStart(2, "0")}
            </span>
          </div>
        </div>

        <div className="flex min-w-0 flex-col">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="lime" dot>Top signal</Badge>
            <TrajectoryBadge trajectory={video.trajectory} />
            <Badge variant="neutral">{video.format === "short" ? "Short" : "Long-form"}</Badge>
            <span className="ml-auto hidden font-mono text-[9px] uppercase tracking-[0.14em] text-fog-600 sm:block">
              {formatAge(video.ageDays)} · {video.channelTitle}
            </span>
          </div>

          <div className="mt-3 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-1.5 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: category?.color ?? "#c6ff4a" }} />
                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-fog-500">
                  {category?.name ?? "General"} · {formatPercent(video.momentum * 100, true)} daily growth
                </span>
              </div>
              <h2 className="max-w-[56ch] font-display text-xl font-semibold leading-snug tracking-tight text-fog-100 sm:text-[23px]">
                {video.title}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <RegionFlags codes={video.regions} max={5} />
                {video.matchedKeywords.slice(0, 1).map((keyword) => (
                  <span key={keyword} className="chip !py-0.5">
                    <Sparkles size={9} className="text-lime-300" />
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
            <ScoreRing score={video.trendScore} size={76} className="hidden shrink-0 sm:inline-flex" />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <FeatureMetric label="Views / day" value={formatCompact(video.viewsPerDay)} icon={Flame} />
            <FeatureMetric label="Momentum" value={formatGrowth(video.momentum)} icon={ArrowUpRight} accent />
            <FeatureMetric label="Engagement" value={formatPercent(video.engagementRate)} icon={Play} />
            <FeatureMetric label="7-day lift" value={formatPercent(lift, true)} icon={Clock3} />
          </div>

          <div className="mt-3.5 flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.06] bg-ink-950/35 px-3 py-2.5">
            <Sparkline
              values={video.history.map((point) => point.views)}
              width={148}
              height={32}
              color="#c6ff4a"
              className="shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-fog-500">
                  Breakout probability
                </span>
                <span className="font-mono text-[10px] font-semibold text-mint-300">
                  {Math.round(video.breakoutProbability * 100)}%
                </span>
              </div>
              <div className="progress-track mt-1.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-mint-500/70 to-mint-300"
                  style={{ width: `${Math.max(3, video.breakoutProbability * 100)}%` }}
                />
              </div>
              <p className="mt-1.5 text-[10px] text-fog-500">
                {forecast
                  ? `Projected ${formatCompact(forecast.predictedViews)} views in 7 days · ${formatCompact(forecast.low)}–${formatCompact(forecast.high)} interval`
                  : "Insufficient history for a calibrated projection."}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => onForecast(video)} className="btn-secondary !px-3 !py-1.5 !text-[11px]">
                Forecast
              </button>
              <button type="button" onClick={() => onOpen(video)} className="btn-primary !px-3 !py-1.5 !text-[11px]">
                Open dossier
                <ArrowUpRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function FeatureMetric({
  label,
  value,
  icon: Icon,
  accent = false
}: {
  label: string;
  value: string;
  icon: typeof Flame;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-white/[0.055] bg-white/[0.022] px-2.5 py-2">
      <div className="flex items-center gap-1 font-mono text-[8px] uppercase tracking-[0.13em] text-fog-600">
        <Icon size={9} />
        {label}
      </div>
      <div className={`mt-1 font-display text-[15px] font-semibold tabular ${accent ? "text-lime-300" : "text-fog-100"}`}>
        {value}
      </div>
    </div>
  );
}
