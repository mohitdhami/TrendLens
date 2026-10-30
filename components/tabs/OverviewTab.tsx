"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Crosshair,
  Eye,
  Flame,
  Gauge,
  Globe2,
  LineChart,
  Sparkles,
  Target,
  TrendingUp
} from "lucide-react";
import { formatCompact, formatPercent, directionInfo } from "@/lib/format";
import type { AnalysisResult, TrendVideo } from "@/lib/types";
import { CategoryDonut, MomentumMap } from "../charts";
import { FeaturedSignal } from "../FeaturedSignal";
import { StatCard } from "../StatCard";
import { TrendTable } from "../TrendTable";
import { Badge, PanelHeading, RegionFlags } from "../ui";

export function OverviewTab({
  result,
  onSelect,
  onTab,
  onForecast
}: {
  result: AnalysisResult;
  onSelect: (video: TrendVideo) => void;
  onTab: (tab: "markets" | "topics" | "forecast" | "playbook") => void;
  onForecast: (video: TrendVideo) => void;
}) {
  const { videos, insights, meta } = result;
  const [showAll, setShowAll] = useState(false);
  const featured = videos[0];
  const videosById = useMemo(() => new Map(videos.map((video) => [video.id, video])), [videos]);

  if (!featured) return null;

  const categorySlices = insights.categories.slice(0, 6).map((category) => ({
    label: category.name,
    value: category.count,
    color: category.color
  }));
  const otherCount = insights.categories.slice(6).reduce((sum, category) => sum + category.count, 0);
  if (otherCount > 0) {
    categorySlices.push({ label: "Other", value: otherCount, color: "#475665" });
  }

  const summary = insights.summary;
  const forecastSummary = insights.forecastSummary;
  const breakoutRate = summary.analyzed ? (forecastSummary.breakoutCandidates / summary.analyzed) * 100 : 0;
  const medianLift = (() => {
    const lifts = videos
      .flatMap((video) => {
        const forecast = video.forecasts.find((item) => item.horizonDays === 7);
        return forecast ? [forecast.predictedViews / Math.max(1, video.views) - 1] : [];
      })
      .sort((a, b) => a - b);
    return lifts.length ? lifts[Math.floor(lifts.length / 2)] * 100 : 0;
  })();

  return (
    <div className="space-y-4">
      <FeaturedSignal
        video={featured}
        onOpen={onSelect}
        onForecast={onForecast}
      />

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Signals above gate"
          value={summary.analyzed}
          hint={`${summary.signalRate}% of ${meta.filtered} candidates`}
          icon={Crosshair}
        />
        <StatCard
          label="Breakout candidates"
          value={forecastSummary.breakoutCandidates}
          hint={`${Math.round(breakoutRate)}% of scanned signals ≥ 60% probability`}
          icon={TrendingUp}
          accent="#4ae3c6"
        />
        <StatCard
          label="Median engagement"
          value={formatPercent(summary.medianEngagement)}
          hint="Likes + weighted comments over views"
          icon={Flame}
          accent="#ffbd5c"
        />
        <StatCard
          label="Signal reach / day"
          value={formatCompact(summary.totalViewsPerDay)}
          hint={`${formatCompact(summary.totalViews)} cumulative views`}
          icon={Eye}
          accent="#5b8cff"
        />
        <StatCard
          label="Median 7-day lift"
          value={formatPercent(medianLift, true)}
          hint={`Model calibrated on ${forecastSummary.calibration.evaluated} grid points`}
          icon={LineChart}
          accent="#9b8cff"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.55fr,1fr]">
        <section className="panel p-4">
          <PanelHeading
            eyebrow="Signal topology"
            title="Momentum vs engagement"
            description="Each bubble is a qualified signal. The upper-right quadrant is where acceleration and audience response line up."
            action={<Badge variant="lime" dot>{videos.length} plotted</Badge>}
          />
          <div className="mt-3">
            <MomentumMap videos={videos} onSelect={onSelect} />
          </div>
        </section>

        <section className="panel flex flex-col p-4">
          <PanelHeading
            eyebrow="Category mix"
            title="Where signals concentrate"
            description="Share of the qualified set, not raw upload volume."
          />
          <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row">
            <CategoryDonut
              slices={categorySlices}
              size={148}
              thickness={15}
              centerValue={String(summary.analyzed)}
              centerLabel="signals"
            />
            <div className="w-full min-w-0 flex-1 space-y-2">
              {insights.categories.slice(0, 6).map((category) => (
                <div key={category.categoryId} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
                  <span className="min-w-0 flex-1 truncate text-[11px] text-fog-300">{category.name}</span>
                  <span className="font-mono text-[9.5px] tabular text-fog-500">{category.count}</span>
                  <span className="w-9 text-right font-mono text-[9.5px] tabular text-fog-300">
                    {category.avgScore.toFixed(0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.022] px-2.5 py-2">
              <div className="font-mono text-[8px] uppercase tracking-[0.12em] text-fog-600">Top category</div>
              <div className="mt-1 truncate text-[11px] font-medium text-fog-100">{summary.topCategory}</div>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.022] px-2.5 py-2">
              <div className="font-mono text-[8px] uppercase tracking-[0.12em] text-fog-600">Short-form share</div>
              <div className="mt-1 font-mono text-[11px] font-semibold text-fog-100">{summary.shortShare}%</div>
            </div>
          </div>
        </section>
      </div>

      <section className="panel overflow-hidden">
        <div className="p-4 pb-3">
          <PanelHeading
            eyebrow="Signal leaderboard"
            title="Ranked by TrendLens score"
            description="Click any row to open the full dossier, evidence and forecast."
            action={
              <button type="button" onClick={() => setShowAll((value) => !value)} className="chip-button">
                {showAll ? "Show top 10" : `Show all ${videos.length}`}
              </button>
            }
          />
        </div>
        <TrendTable videos={videos} onSelect={onSelect} limit={showAll ? 60 : 10} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel p-4">
          <PanelHeading
            eyebrow="Keyword opportunity"
            title="Terms carrying momentum"
            description="Derived from titles, tags and descriptions across the qualified pool."
            action={
              <button type="button" onClick={() => onTab("topics")} className="text-[10.5px] font-medium text-lime-300 hover:text-lime-200">
                All topics →
              </button>
            }
          />
          <div className="mt-3 space-y-1.5">
            {insights.keywords.slice(0, 6).map((keyword, index) => {
              const direction = directionInfo(keyword.direction);
              return (
                <button
                  key={keyword.term}
                  type="button"
                  onClick={() => {
                    const video = videosById.get(keyword.topVideoId);
                    if (video) onSelect(video);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg border border-transparent px-2 py-2 text-left transition-colors hover:border-white/[0.07] hover:bg-white/[0.03]"
                >
                  <span className="w-4 shrink-0 font-mono text-[9px] text-fog-600">{String(index + 1).padStart(2, "0")}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11.5px] font-medium text-fog-200">{keyword.term}</span>
                    <span className="mt-0.5 block font-mono text-[8.5px] uppercase tracking-[0.1em] text-fog-600">
                      {keyword.count} signal{keyword.count === 1 ? "" : "s"} · {keyword.regionSpread} market{keyword.regionSpread === 1 ? "" : "s"} · {keyword.categoryName}
                    </span>
                  </span>
                  <span className={`shrink-0 rounded-full border px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.08em] ${direction.bg} ${direction.text}`}>
                    {direction.label}
                  </span>
                  <span className="w-9 shrink-0 text-right font-mono text-[11px] font-semibold tabular text-lime-300">
                    {keyword.opportunity.toFixed(0)}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="panel p-4">
          <PanelHeading
            eyebrow="Cross-market reach"
            title="Signals travelling between charts"
            description="Topics charting in multiple selected markets are stronger candidates for a pan-regional play."
            action={
              <button type="button" onClick={() => onTab("markets")} className="text-[10.5px] font-medium text-lime-300 hover:text-lime-200">
                Market detail →
              </button>
            }
          />
          <div className="mt-3 space-y-1">
            {insights.overlaps.slice(0, 5).map((overlap) => {
              const video = videosById.get(overlap.id);
              return (
                <button
                  key={overlap.id}
                  type="button"
                  onClick={() => video && onSelect(video)}
                  className="flex w-full items-center gap-3 rounded-lg border border-transparent px-2 py-2 text-left transition-colors hover:border-white/[0.07] hover:bg-white/[0.03]"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-mint-400/15 bg-mint-400/[0.06] font-mono text-[9px] font-semibold text-mint-300">
                    {overlap.regions.length}x
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11.5px] font-medium text-fog-200">{overlap.title}</span>
                    <span className="mt-1 block">
                      <RegionFlags codes={overlap.regions} max={4} />
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-mono text-[11px] font-semibold tabular text-fog-200">
                      {overlap.trendScore.toFixed(0)}
                    </span>
                    <span className="block font-mono text-[8px] uppercase tracking-[0.08em] text-fog-600">score</span>
                  </span>
                  <ArrowUpRight size={11} className="shrink-0 text-fog-600" />
                </button>
              );
            })}
            {insights.overlaps.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/[0.08] px-3 py-6 text-center text-[11px] text-fog-500">
                No multi-market overlaps in this scan. Widen the market set or lower precision.
              </div>
            ) : null}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/[0.06] pt-3">
            <Mini label="Multi-market" value={String(summary.multiRegionCount)} icon={Globe2} />
            <Mini label="Markets" value={`${summary.regions}`} icon={Target} />
            <Mini label="Top market" value={summary.topRegion} icon={Gauge} />
          </div>
        </section>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.018] px-4 py-3">
        <Sparkles size={13} className="text-lime-300" />
        <p className="text-[11px] leading-relaxed text-fog-400">
          Want a ready-to-shoot angle? The playbook turns these signals into {insights.suggestions.length} ranked content ideas.
        </p>
        <button type="button" onClick={() => onTab("playbook")} className="ml-auto chip-button">
          Open playbook
          <ArrowUpRight size={10} />
        </button>
      </div>
    </div>
  );
}

function Mini({
  label,
  value,
  icon: Icon
}: {
  label: string;
  value: string;
  icon: typeof Globe2;
}) {
  return (
    <div>
      <div className="flex items-center gap-1 font-mono text-[8px] uppercase tracking-[0.1em] text-fog-600">
        <Icon size={9} />
        {label}
      </div>
      <div className="mt-1 font-display text-[14px] font-semibold text-fog-100">{value}</div>
    </div>
  );
}
