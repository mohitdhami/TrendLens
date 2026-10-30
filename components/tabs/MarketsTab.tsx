"use client";

import { ArrowUpRight, Crosshair, Flame, Globe2, Layers, MapPin, Target, Trophy } from "lucide-react";
import { REGION_MAP } from "@/lib/constants";
import { formatCompact, formatPercent } from "@/lib/format";
import type { AnalysisResult, TrendVideo } from "@/lib/types";
import { RegionCategoryHeatmap } from "../charts";
import { StatCard } from "../StatCard";
import { Badge, Meter, PanelHeading, RegionFlags, SectionHeader } from "../ui";

export function MarketsTab({
  result,
  onSelect
}: {
  result: AnalysisResult;
  onSelect: (video: TrendVideo) => void;
}) {
  const { insights, videos, meta } = result;
  const videosById = new Map(videos.map((video) => [video.id, video]));
  const topRegion = insights.regions[0];
  const heatmapRegions = meta.regions.map((code) => ({ code, name: REGION_MAP.get(code)?.name ?? code }));
  const multiRegion = insights.overlaps.slice(0, 8);

  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Market intelligence"
        title="Which chart is overheating?"
        description="Compare opportunity across every selected market. Market opportunity blends signal quality, breakout rate and how under-served the chart is."
        action={<Badge variant="mint" dot>{meta.regions.length} markets live</Badge>}
      />

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <StatCard
          label="Markets scanned"
          value={meta.regions.length}
          hint={meta.regions.map((code) => REGION_MAP.get(code)?.code ?? code).join(" · ")}
          icon={Globe2}
        />
        <StatCard
          label="Top market"
          value={topRegion?.code ?? "—"}
          hint={topRegion ? `${topRegion.name} · ${topRegion.opportunity.toFixed(0)} opportunity` : "No data"}
          icon={MapPin}
          accent="#4ae3c6"
        />
        <StatCard
          label="Multi-market signals"
          value={insights.summary.multiRegionCount}
          hint="Signals charting in 2+ selected markets"
          icon={Layers}
          accent="#9b8cff"
        />
        <StatCard
          label="Cross-market reach"
          value={formatCompact(insights.summary.totalViewsPerDay)}
          hint="Aggregate views per day across qualified signals"
          icon={Flame}
          accent="#ffbd5c"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {insights.regions.map((region, index) => {
          const flag = REGION_MAP.get(region.code)?.flag ?? "🌐";
          const topVideo = videosById.get(region.topVideoId);
          return (
            <article key={region.code} className="panel relative overflow-hidden p-4">
              {index === 0 ? (
                <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-lime-400/60 to-transparent" />
              ) : null}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-lg">
                    {flag}
                  </span>
                  <div>
                    <div className="font-display text-[14px] font-semibold text-fog-100">{region.name}</div>
                    <div className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-fog-600">
                      {region.code} · {region.count} candidates
                    </div>
                  </div>
                </div>
                <span
                  className={`font-mono text-[9px] uppercase tracking-[0.1em] ${
                    index === 0 ? "text-lime-300" : "text-fog-500"
                  }`}
                >
                  #{String(index + 1).padStart(2, "0")}
                </span>
              </div>

              <div className="mt-3.5 flex items-end justify-between gap-2">
                <div>
                  <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-fog-600">Opportunity</div>
                  <div className="mt-0.5 font-display text-[24px] font-semibold leading-none text-lime-300">
                    {region.opportunity.toFixed(0)}
                    <span className="ml-1 font-mono text-[9px] font-normal text-fog-600">/100</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-fog-600">Avg score</div>
                  <div className="mt-0.5 font-mono text-[13px] font-semibold tabular text-fog-200">
                    {region.avgScore.toFixed(1)}
                  </div>
                </div>
              </div>
              <Meter value={region.opportunity} className="mt-2" color={index === 0 ? "#c6ff4a" : "#4ae3c6"} />

              <div className="mt-3 grid grid-cols-3 gap-2">
                <Cell label="Median / day" value={formatCompact(region.medianViewsPerDay)} />
                <Cell label="Engage" value={formatPercent(region.avgEngagement)} />
                <Cell label="Breakouts" value={String(region.breakoutCount)} accent={region.breakoutCount > 0} />
              </div>

              <div className="mt-3 flex items-center gap-1.5">
                <span className="chip !py-0.5 !text-[9.5px]">
                  <Trophy size={9} className="text-amber-400" />
                  {region.topCategoryName}
                </span>
                {region.breakoutCount > 0 ? (
                  <span className="chip !py-0.5 !text-[9.5px]">
                    <Flame size={9} className="text-coral-400" />
                    {region.breakoutCount} breakout{region.breakoutCount === 1 ? "" : "s"}
                  </span>
                ) : null}
              </div>

              {topVideo ? (
                <button
                  type="button"
                  onClick={() => onSelect(topVideo)}
                  className="mt-3 flex w-full items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2 text-left transition-colors hover:border-lime-400/20 hover:bg-white/[0.04]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-[8px] uppercase tracking-[0.12em] text-fog-600">Top signal</span>
                    <span className="mt-0.5 block truncate text-[10.5px] text-fog-200">{region.topVideoTitle}</span>
                  </span>
                  <ArrowUpRight size={11} className="shrink-0 text-fog-500" />
                </button>
              ) : null}
            </article>
          );
        })}
      </div>

      <section className="panel p-4">
        <PanelHeading
          eyebrow="Region × category"
          title="Where each market over-indexes"
          description="Average signal score for every market/category pair. Brighter cells indicate a stronger qualified signal pool."
          action={<Badge variant="neutral">pre-gate candidate pool</Badge>}
        />
        <div className="mt-4">
          <RegionCategoryHeatmap matrix={insights.matrix} regions={heatmapRegions} />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.3fr,1fr]">
        <section className="panel p-4">
          <PanelHeading
            eyebrow="Cross-market overlap"
            title="Signals charting in multiple markets"
            description="The strongest evidence of durable demand. More markets means less dependence on a single algorithm."
            action={<Badge variant="mint" dot>{insights.overlaps.length} overlaps</Badge>}
          />
          <div className="mt-3 space-y-1">
            {multiRegion.map((overlap) => {
              const video = videosById.get(overlap.id);
              return (
                <button
                  key={overlap.id}
                  type="button"
                  onClick={() => video && onSelect(video)}
                  className="flex w-full items-center gap-3 rounded-lg border border-transparent px-2 py-2.5 text-left transition-colors hover:border-white/[0.07] hover:bg-white/[0.03]"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-mint-400/15 bg-mint-400/[0.06] font-mono text-[10px] font-semibold text-mint-300">
                    {overlap.regions.length}x
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11.5px] font-medium text-fog-200">{overlap.title}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5">
                      <RegionFlags codes={overlap.regions} max={4} />
                      <span className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-fog-600">
                        {overlap.categoryName}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-mono text-[11px] font-semibold tabular text-fog-200">
                      {formatCompact(overlap.views)}
                    </span>
                    <span className="block font-mono text-[8px] uppercase tracking-[0.08em] text-fog-600">views</span>
                  </span>
                  <ArrowUpRight size={11} className="shrink-0 text-fog-600" />
                </button>
              );
            })}
            {multiRegion.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/[0.08] px-3 py-8 text-center text-[11px] text-fog-500">
                No signals appear in more than one selected market.
              </div>
            ) : null}
          </div>
        </section>

        <section className="panel p-4">
          <PanelHeading
            eyebrow="Region distribution"
            title="Where the qualified pool sits"
            description="Candidate count per market before the precision gate."
          />
          <div className="mt-4 space-y-3">
            {[...insights.regions].sort((a, b) => b.count - a.count).map((region) => {
              const max = Math.max(...insights.regions.map((item) => item.count), 1);
              return (
                <div key={region.code}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-[11px] text-fog-300">
                      <span>{REGION_MAP.get(region.code)?.flag ?? "🌐"}</span>
                      {region.name}
                    </span>
                    <span className="font-mono text-[9.5px] tabular text-fog-500">
                      {region.count} <span className="text-fog-600">signals</span>
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-lime-400/50 to-mint-400/70"
                      style={{ width: `${Math.max(4, (region.count / max) * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
            <Crosshair size={13} className="shrink-0 text-lime-300" />
            <p className="text-[10px] leading-relaxed text-fog-400">
              Opportunity scores are relative to the selected markets. Re-scan with a different region set to recalibrate.
            </p>
          </div>
        </section>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.018] px-4 py-3">
        <Target size={13} className="text-mint-300" />
        <p className="text-[11px] leading-relaxed text-fog-400">
          {topRegion
            ? `${topRegion.name} currently offers the best quality-to-competition ratio in this scan.`
            : "Add more markets to uncover regional opportunity gaps."}
        </p>
        <span className="ml-auto font-mono text-[8.5px] uppercase tracking-[0.14em] text-fog-600">
          {meta.regions.length} markets · {insights.regions.reduce((sum, region) => sum + region.count, 0)} market-signal pairs
        </span>
      </div>
    </div>
  );
}

function Cell({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-white/[0.055] bg-white/[0.02] px-2 py-1.5">
      <div className="font-mono text-[7.5px] uppercase tracking-[0.1em] text-fog-600">{label}</div>
      <div className={`mt-0.5 font-mono text-[10.5px] font-semibold tabular ${accent ? "text-mint-300" : "text-fog-200"}`}>
        {value}
      </div>
    </div>
  );
}
