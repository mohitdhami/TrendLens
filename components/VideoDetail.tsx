"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Clock3, Eye, Heart, MessageCircle, Radio, X } from "lucide-react";
import { CATEGORY_MAP } from "@/lib/constants";
import {
  formatAge,
  formatCompact,
  formatDate,
  formatDuration,
  formatGrowth,
  formatLift,
  formatPercent
} from "@/lib/format";
import type { Meta, TrendVideo } from "@/lib/types";
import { ForecastChart, ScoreRing } from "./charts";
import { Badge, ConfidenceBadge, CopyButton, RegionFlags, TrajectoryBadge } from "./ui";
import { VideoArtwork } from "./VideoArtwork";

const BREAKDOWN = [
  { key: "velocity", label: "Velocity", color: "#c6ff4a" },
  { key: "momentum", label: "Momentum", color: "#4ae3c6" },
  { key: "engagement", label: "Engagement", color: "#ffbd5c" },
  { key: "freshness", label: "Freshness", color: "#5b8cff" },
  { key: "reach", label: "Reach", color: "#9b8cff" },
  { key: "relevance", label: "Relevance", color: "#f472b6" }
] as const;

function buildBrief(video: TrendVideo): string {
  const forecast = video.forecasts.find((item) => item.horizonDays === 7);
  return [
    `# ${video.title}`,
    `${video.channelTitle} · ${video.format === "short" ? "Short" : "Long-form"} · ${formatAge(video.ageDays)} old`,
    `Markets: ${video.regions.join(", ")} · Category: ${CATEGORY_MAP.get(video.categoryId)?.name ?? "General"}`,
    "",
    `Signal score: ${video.trendScore.toFixed(1)} / 100 · trajectory ${video.trajectory} · breakout ${Math.round(video.breakoutProbability * 100)}%`,
    `Views: ${formatCompact(video.views)} · ${formatCompact(video.viewsPerDay)}/day · engagement ${formatPercent(video.engagementRate)} · momentum ${formatGrowth(video.momentum)}/day`,
    forecast
      ? `7-day forecast: ${formatCompact(forecast.predictedViews)} views (${formatCompact(forecast.low)}–${formatCompact(forecast.high)} at 80% confidence)`
      : "7-day forecast: insufficient history",
    "",
    "Why it matters:",
    `${video.regions.length >= 2 ? `Present in ${video.regions.length} selected markets. ` : "Single-market signal. "}${
      video.momentum >= 0.3
        ? "Momentum is accelerating well above the candidate median. "
        : video.momentum >= 0
          ? "Momentum is positive but within the normal range. "
          : "View growth is cooling; treat as a late-cycle signal. "
    }Engagement of ${formatPercent(video.engagementRate)} ${
      video.engagementRate >= 8 ? "sits in the top band of the scanned pool." : "is close to the scanned median."
    }`,
    "",
    "Source: TrendLens Signal Engine 1.3"
  ].join("\n");
}

export function VideoDetail({
  video,
  meta,
  onClose
}: {
  video: TrendVideo | null;
  meta: Meta;
  onClose: () => void;
}) {
  const [horizon, setHorizon] = useState<7 | 30 | 90>(7);

  useEffect(() => {
    if (video) setHorizon(7);
  }, [video]);

  useEffect(() => {
    if (!video) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", handleKey);
    };
  }, [video, onClose]);

  if (!video) return null;

  const category = CATEGORY_MAP.get(video.categoryId);
  const forecast = video.forecasts.find((item) => item.horizonDays === horizon);
  const lift = forecast ? formatLift(video.views, forecast.predictedViews) : 0;
  const topWeight = Math.max(...BREAKDOWN.map((item) => meta.weights[item.key]));

  return (
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        aria-label="Close signal dossier"
        onClick={onClose}
        className="absolute inset-0 bg-ink-950/70 backdrop-blur-[2px]"
      />
      <aside role="dialog" aria-modal="true" aria-label={`${video.title} signal dossier`} className="drawer-panel max-w-[600px]">
        <header className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-lime-400/20 bg-lime-400/[0.08] text-lime-300">
              <Radio size={13} />
            </span>
            <div>
              <div className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-fog-500">Signal dossier</div>
              <div className="font-display text-[12.5px] font-semibold text-fog-100">
                Rank #{video.rank} · {video.trendScore.toFixed(1)} score
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="btn-icon !h-8 !w-8" aria-label="Close">
            <X size={15} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-5 p-4 sm:p-5">
            <div>
              <VideoArtwork video={video} variant="feature" />
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <TrajectoryBadge trajectory={video.trajectory} />
                <Badge variant="neutral">{video.format === "short" ? "Short" : "Long-form"}</Badge>
                <Badge variant="neutral">{formatDuration(video.durationSeconds)}</Badge>
                <Badge variant={video.source === "live" ? "sky" : "violet"}>{video.source === "live" ? "Live chart" : "Demo feed"}</Badge>
              </div>
              <h2 className="mt-3 font-display text-lg font-semibold leading-snug tracking-tight text-fog-100">
                {video.title}
              </h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-fog-400">
                <span className="font-medium text-fog-300">{video.channelTitle}</span>
                <span className="text-fog-600">·</span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: category?.color ?? "#8495a5" }} />
                  {category?.name ?? "General"}
                </span>
                <span className="text-fog-600">·</span>
                <span>{formatAge(video.ageDays)}</span>
                <span className="text-fog-600">·</span>
                <span>published {formatDate(video.publishedAt)}</span>
              </div>
              <div className="mt-2.5">
                <RegionFlags codes={video.regions} max={12} showNames />
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
              <ScoreRing score={video.trendScore} size={72} stroke={5} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-fog-500">
                    Breakout probability
                  </span>
                  <span className="font-mono text-[11px] font-semibold text-mint-300">
                    {Math.round(video.breakoutProbability * 100)}%
                  </span>
                </div>
                <div className="progress-track mt-1.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-mint-500/60 to-mint-300"
                    style={{ width: `${Math.max(3, video.breakoutProbability * 100)}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-fog-500">Model confidence</span>
                  <ConfidenceBadge confidence={forecast?.confidence ?? "low"} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Metric icon={Eye} label="Total views" value={formatCompact(video.views)} />
              <Metric icon={ArrowUpRight} label="Views / day" value={formatCompact(video.viewsPerDay)} accent />
              <Metric icon={Clock3} label="Momentum" value={formatGrowth(video.momentum)} accent={video.momentum > 0} />
              <Metric icon={Heart} label="Likes" value={formatCompact(video.likes)} />
              <Metric icon={MessageCircle} label="Comments" value={formatCompact(video.comments)} />
              <Metric icon={Radio} label="Engagement" value={formatPercent(video.engagementRate)} />
            </div>

            <section>
              <div className="mb-2 flex items-end justify-between gap-3">
                <div>
                  <div className="eyebrow mb-1">Projection</div>
                  <h3 className="font-display text-[14px] font-semibold text-fog-100">Damped momentum forecast</h3>
                </div>
                <div className="flex rounded-lg border border-white/[0.08] bg-ink-950/60 p-0.5">
                  {([7, 30, 90] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setHorizon(value)}
                      className={`rounded-md px-2 py-1 font-mono text-[9px] uppercase tracking-[0.08em] transition-colors ${
                        horizon === value ? "bg-white/[0.09] text-fog-100" : "text-fog-500 hover:text-fog-200"
                      }`}
                    >
                      {value}d
                    </button>
                  ))}
                </div>
              </div>
              <div className="panel-flat p-3">
                <ForecastChart video={video} horizon={horizon} height={200} />
              </div>
              {forecast ? (
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <SmallStat label="Projected" value={formatCompact(forecast.predictedViews)} />
                  <SmallStat label={`${horizon}d lift`} value={formatPercent(lift, true)} accent />
                  <SmallStat
                    label="80% interval"
                    value={`${formatCompact(forecast.low)}–${formatCompact(forecast.high)}`}
                  />
                </div>
              ) : null}
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-display text-[14px] font-semibold text-fog-100">Score breakdown</h3>
                <span className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-fog-600">
                  Precision {meta.precision}
                </span>
              </div>
              <div className="space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                {BREAKDOWN.map((item) => {
                  const weight = meta.weights[item.key];
                  return (
                    <div key={item.key} className="flex items-center gap-2.5">
                      <span className="w-[68px] shrink-0 text-[10px] text-fog-400">{item.label}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.max(2, video.scores[item.key])}%`, backgroundColor: item.color }}
                        />
                      </div>
                      <span className="w-7 text-right font-mono text-[9.5px] tabular text-fog-300">
                        {Math.round(video.scores[item.key])}
                      </span>
                      <span
                        className={`w-8 text-right font-mono text-[8.5px] tabular ${
                          weight === topWeight ? "text-lime-300" : "text-fog-600"
                        }`}
                      >
                        {Math.round(weight * 100)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section>
              <div className="eyebrow mb-2">Keywords & tags</div>
              <div className="flex flex-wrap gap-1.5">
                {[...new Set([...video.matchedKeywords, ...video.tags.slice(0, 6)])].map((tag) => (
                  <span key={tag} className="chip !text-[10px]">
                    {tag}
                  </span>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-lime-400/[0.14] bg-lime-400/[0.035] p-3.5">
              <div className="mb-1.5 font-mono text-[8.5px] uppercase tracking-[0.16em] text-lime-300/80">
                Why this signal matters
              </div>
              <p className="text-[11.5px] leading-relaxed text-fog-300">
                {video.regions.length >= 2
                  ? `This topic is charting in ${video.regions.length} selected markets, which raises its cross-market durability. `
                  : "This signal is currently concentrated in one market — validate locally before scaling spend. "}
                {video.momentum >= 0.3
                  ? `Daily growth of ${formatGrowth(video.momentum)} is in the top band of this scan. `
                  : video.momentum >= 0
                    ? `Daily growth of ${formatGrowth(video.momentum)} is positive but still building. `
                    : "Growth is cooling, so this is a late-cycle opportunity. "}
                {forecast
                  ? `The ${horizon}-day model projects ${formatCompact(forecast.predictedViews)} cumulative views within an 80% interval of ${formatCompact(forecast.low)}–${formatCompact(forecast.high)}.`
                  : "There is not enough snapshot history for a reliable projection."}
              </p>
            </section>

            <div className="flex flex-wrap items-center gap-2">
              <CopyButton text={buildBrief(video)} label="Copy signal brief" variant="secondary" />
              {video.source === "live" ? (
                <a
                  href={`https://www.youtube.com/watch?v=${video.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary !px-3 !py-1.5 !text-[11px]"
                >
                  Open on YouTube
                  <ArrowUpRight size={12} />
                </a>
              ) : null}
              <span className="ml-auto text-right font-mono text-[8.5px] uppercase tracking-[0.1em] text-fog-600">
                {meta.modelVersion}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  accent = false
}: {
  icon: typeof Eye;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.022] px-2.5 py-2">
      <div className="flex items-center gap-1 font-mono text-[8px] uppercase tracking-[0.12em] text-fog-600">
        <Icon size={9} />
        {label}
      </div>
      <div className={`mt-1 font-mono text-[12.5px] font-semibold tabular ${accent ? "text-lime-300" : "text-fog-100"}`}>
        {value}
      </div>
    </div>
  );
}

function SmallStat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.022] px-2.5 py-2">
      <div className="font-mono text-[8px] uppercase tracking-[0.12em] text-fog-600">{label}</div>
      <div className={`mt-1 truncate font-mono text-[11px] font-semibold tabular ${accent ? "text-lime-300" : "text-fog-100"}`}>
        {value}
      </div>
    </div>
  );
}
