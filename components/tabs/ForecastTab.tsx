"use client";

import { useEffect, useState } from "react";
import { Activity, ArrowUpRight, BarChart3, Crosshair, Gauge, LineChart, ShieldCheck, Target } from "lucide-react";
import { formatCompact, formatLift, formatPercent } from "@/lib/format";
import type { AnalysisResult, TrendVideo } from "@/lib/types";
import { ForecastChart } from "../charts";
import { StatCard } from "../StatCard";
import { Badge, ConfidenceBadge, PanelHeading, RegionFlags, SectionHeader, TrajectoryBadge } from "../ui";
import { VideoArtwork } from "../VideoArtwork";

type Horizon = 7 | 30 | 90;

export function ForecastTab({
  result,
  onSelect,
  initialVideoId
}: {
  result: AnalysisResult;
  onSelect: (video: TrendVideo) => void;
  initialVideoId?: string | null;
}) {
  const { videos, insights } = result;
  const [selectedId, setSelectedId] = useState(
    initialVideoId ?? insights.forecastSummary.topForecastId ?? videos[0]?.id ?? ""
  );
  const [horizon, setHorizon] = useState<Horizon>(7);

  useEffect(() => {
    if (initialVideoId && videos.some((video) => video.id === initialVideoId)) {
      setSelectedId(initialVideoId);
      setHorizon(7);
    }
  }, [initialVideoId, videos]);

  const selected = videos.find((video) => video.id === selectedId) ?? videos[0];
  if (!selected) return null;

  const summary = insights.forecastSummary;
  const headlineForecast = selected.forecasts.find((forecast) => forecast.horizonDays === horizon);
  const headlineLift = headlineForecast ? formatLift(selected.views, headlineForecast.predictedViews) : 0;

  const leaders = [...videos]
    .sort((a, b) => {
      const aForecast = a.forecasts.find((forecast) => forecast.horizonDays === 7);
      const bForecast = b.forecasts.find((forecast) => forecast.horizonDays === 7);
      return (bForecast?.predictedViews ?? b.views) - b.views - ((aForecast?.predictedViews ?? a.views) - a.views);
    })
    .slice(0, 10);

  const confidenceMix = summary.confidenceMix;
  const confidenceTotal = Math.max(1, confidenceMix.high + confidenceMix.medium + confidenceMix.low);

  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Forecast lab"
        title="What the curve does next"
        description="A damped power-law momentum model projects cumulative views with 80% intervals. The damping scale is calibrated by walk-forward holdout on the observed history."
        action={<Badge variant="violet" dot>Model 1.3</Badge>}
      />

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <StatCard
          label="Breakout candidates"
          value={summary.breakoutCandidates}
          hint={`Probability ≥ 60% · ${formatPercent((summary.breakoutCandidates / Math.max(1, insights.summary.analyzed)) * 100)} of signals`}
          icon={Target}
          accent="#4ae3c6"
        />
        <StatCard
          label="Projected 7-day reach"
          value={formatCompact(summary.expected7dViews)}
          hint="Sum of cumulative 7-day projections"
          icon={LineChart}
          accent="#c6ff4a"
        />
        <StatCard
          label="Median daily growth"
          value={formatPercent(summary.medianGrowth * 100, true)}
          hint="Across all qualified signals"
          icon={Activity}
          accent="#5b8cff"
        />
        <StatCard
          label="Backtest median error"
          value={summary.backtest.medianError === null ? "—" : formatPercent(summary.backtest.medianError)}
          hint={
            summary.backtest.mape === null
              ? "Not enough snapshot history"
              : `MAPE ${formatPercent(summary.backtest.mape)} · n=${summary.backtest.sampleSize}`
          }
          icon={Gauge}
          accent="#ffbd5c"
        />
      </div>

      <section className="panel p-4">
        <PanelHeading
          eyebrow="Signal projection"
          title="Forecast workbench"
          description="Select any qualified signal, then change the horizon to stress-test the outlook."
          action={
            <select
              value={selected.id}
              onChange={(event) => setSelectedId(event.target.value)}
              className="select-field max-w-[260px] !py-1.5 !text-[11px]"
            >
              {videos.map((video) => (
                <option key={video.id} value={video.id}>
                  {video.title}
                </option>
              ))}
            </select>
          }
        />

        <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr,1fr]">
          <div className="rounded-xl border border-white/[0.06] bg-ink-950/35 p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex rounded-lg border border-white/[0.08] bg-ink-950/70 p-0.5">
                {([7, 30, 90] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setHorizon(value)}
                    className={`rounded-md px-3 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.08em] transition-colors ${
                      horizon === value ? "bg-white/[0.09] text-fog-100" : "text-fog-500 hover:text-fog-200"
                    }`}
                  >
                    {value} days
                  </button>
                ))}
              </div>
              <ConfidenceBadge confidence={headlineForecast?.confidence ?? "low"} />
            </div>
            <ForecastChart video={selected} horizon={horizon} height={260} />
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => onSelect(selected)}
              className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-2.5 text-left transition-colors hover:border-lime-400/25 hover:bg-white/[0.04]"
            >
              <VideoArtwork video={selected} variant="thumb" className="w-[84px] shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-1">
                  <TrajectoryBadge trajectory={selected.trajectory} />
                  <Badge variant="neutral">{selected.format === "short" ? "Short" : "Long"}</Badge>
                </span>
                <span className="mt-1 block truncate text-[12px] font-medium text-fog-100">{selected.title}</span>
                <span className="mt-1 block">
                  <RegionFlags codes={selected.regions} max={4} />
                </span>
              </span>
              <ArrowUpRight size={13} className="shrink-0 text-fog-500" />
            </button>

            <div className="grid grid-cols-2 gap-2">
              <ForecastStat label="Current views" value={formatCompact(selected.views)} />
              <ForecastStat label={`${horizon}-day projection`} value={headlineForecast ? formatCompact(headlineForecast.predictedViews) : "—"} accent />
              <ForecastStat label="Projected lift" value={headlineForecast ? formatPercent(headlineLift, true) : "—"} accent />
              <ForecastStat
                label="80% interval"
                value={headlineForecast ? `${formatCompact(headlineForecast.low)}–${formatCompact(headlineForecast.high)}` : "—"}
              />
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <div className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-fog-500">Model read</div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-fog-400">
                {selected.momentum >= 0.3
                  ? "Momentum is in the top band. The model expects continued growth, damped for platform saturation."
                  : selected.momentum >= 0
                    ? "Momentum is modest. Projections assume the current rate persists with natural deceleration."
                    : "Momentum is negative. The forecast holds views flat rather than projecting a decline in cumulative views."}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {selected.forecasts.map((forecast) => (
                <div key={forecast.horizonDays} className="rounded-lg border border-white/[0.055] bg-white/[0.02] px-2 py-1.5 text-center">
                  <div className="font-mono text-[7.5px] uppercase tracking-[0.1em] text-fog-600">{forecast.horizonDays}d</div>
                  <div className="mt-0.5 font-mono text-[10.5px] font-semibold tabular text-fog-200">
                    {formatCompact(forecast.predictedViews)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="p-4 pb-3">
          <PanelHeading
            eyebrow="Forecast leaderboard"
            title="Signals with the biggest 7-day gains"
            description="Ranked by projected 7-day view gain. Click a row to load it into the workbench."
            action={<Badge variant="lime" dot>{videos.length} models</Badge>}
          />
        </div>
        <div className="divide-y divide-white/[0.055] md:hidden">
          {leaders.map((video, index) => {
            const forecast7 = video.forecasts.find((forecast) => forecast.horizonDays === 7);
            const forecast30 = video.forecasts.find((forecast) => forecast.horizonDays === 30);
            const forecast90 = video.forecasts.find((forecast) => forecast.horizonDays === 90);
            const lift = forecast7 ? formatLift(video.views, forecast7.predictedViews) : 0;
            return (
              <button
                key={video.id}
                type="button"
                onClick={() => {
                  setSelectedId(video.id);
                  setHorizon(7);
                }}
                className={`flex w-full items-start gap-2 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.03] ${
                  video.id === selected.id ? "bg-lime-400/[0.035]" : ""
                }`}
              >
                <span className="w-4 shrink-0 pt-0.5 font-mono text-[9px] tabular text-fog-600">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-[11.5px] font-medium leading-snug text-fog-100">{video.title}</span>
                  <span className="mt-0.5 block truncate font-mono text-[8px] uppercase tracking-[0.08em] text-fog-600">
                    {video.channelTitle} · score {video.trendScore.toFixed(0)}
                  </span>
                  <span className="mt-2 grid grid-cols-4 gap-1">
                    <span className="rounded border border-white/[0.055] bg-white/[0.02] px-1.5 py-1">
                      <span className="block font-mono text-[7px] uppercase tracking-[0.1em] text-fog-600">Now</span>
                      <span className="mt-0.5 block font-mono text-[9.5px] tabular text-fog-300">{formatCompact(video.views)}</span>
                    </span>
                    <span className="rounded border border-lime-400/15 bg-lime-400/[0.04] px-1.5 py-1">
                      <span className="block font-mono text-[7px] uppercase tracking-[0.1em] text-fog-600">7d</span>
                      <span className="mt-0.5 block font-mono text-[9.5px] tabular text-fog-100">{forecast7 ? formatCompact(forecast7.predictedViews) : "—"}</span>
                      <span className="block font-mono text-[7.5px] text-lime-300">{formatPercent(lift, true)}</span>
                    </span>
                    <span className="rounded border border-white/[0.055] bg-white/[0.02] px-1.5 py-1">
                      <span className="block font-mono text-[7px] uppercase tracking-[0.1em] text-fog-600">30d</span>
                      <span className="mt-0.5 block font-mono text-[9.5px] tabular text-fog-400">{forecast30 ? formatCompact(forecast30.predictedViews) : "—"}</span>
                    </span>
                    <span className="rounded border border-white/[0.055] bg-white/[0.02] px-1.5 py-1">
                      <span className="block font-mono text-[7px] uppercase tracking-[0.1em] text-fog-600">90d</span>
                      <span className="mt-0.5 block font-mono text-[9.5px] tabular text-fog-400">{forecast90 ? formatCompact(forecast90.predictedViews) : "—"}</span>
                    </span>
                  </span>
                </span>
                <ArrowUpRight size={12} className="mt-0.5 shrink-0 text-fog-600" />
              </button>
            );
          })}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="thead-cell w-10 pl-4">#</th>
                <th className="thead-cell">Signal</th>
                <th className="thead-cell">Now</th>
                <th className="thead-cell">7d</th>
                <th className="thead-cell hidden sm:table-cell">30d</th>
                <th className="thead-cell hidden lg:table-cell">90d</th>
                <th className="thead-cell hidden md:table-cell">Breakout</th>
                <th className="thead-cell w-8 pr-4" />
              </tr>
            </thead>
            <tbody>
              {leaders.map((video, index) => {
                const forecast7 = video.forecasts.find((forecast) => forecast.horizonDays === 7);
                const forecast30 = video.forecasts.find((forecast) => forecast.horizonDays === 30);
                const forecast90 = video.forecasts.find((forecast) => forecast.horizonDays === 90);
                const lift = forecast7 ? formatLift(video.views, forecast7.predictedViews) : 0;
                return (
                  <tr
                    key={video.id}
                    onClick={() => {
                      setSelectedId(video.id);
                      setHorizon(7);
                    }}
                    className={`data-row group cursor-pointer ${video.id === selected.id ? "bg-lime-400/[0.035]" : ""}`}
                  >
                    <td className="py-2.5 pl-4 pr-1 font-mono text-[10px] tabular text-fog-600">
                      {String(index + 1).padStart(2, "0")}
                    </td>
                    <td className="tbody-cell !py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="line-clamp-1 max-w-[320px] text-[11.5px] font-medium text-fog-100 group-hover:text-lime-200">
                          {video.title}
                        </span>
                        <Badge variant="neutral" className="hidden shrink-0 xl:inline-flex">
                          {video.format === "short" ? "Short" : "Long"}
                        </Badge>
                      </div>
                      <div className="mt-0.5 font-mono text-[8.5px] uppercase tracking-[0.1em] text-fog-600">
                        {video.channelTitle} · score {video.trendScore.toFixed(0)}
                      </div>
                    </td>
                    <td className="tbody-cell font-mono text-[10.5px] tabular text-fog-300">{formatCompact(video.views)}</td>
                    <td className="tbody-cell">
                      <div className="font-mono text-[10.5px] tabular text-fog-100">
                        {forecast7 ? formatCompact(forecast7.predictedViews) : "—"}
                      </div>
                      <div className="mt-0.5 font-mono text-[8.5px] text-lime-300">{formatPercent(lift, true)}</div>
                    </td>
                    <td className="tbody-cell hidden font-mono text-[10.5px] tabular text-fog-400 sm:table-cell">
                      {forecast30 ? formatCompact(forecast30.predictedViews) : "—"}
                    </td>
                    <td className="tbody-cell hidden font-mono text-[10.5px] tabular text-fog-400 lg:table-cell">
                      {forecast90 ? formatCompact(forecast90.predictedViews) : "—"}
                    </td>
                    <td className="tbody-cell hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="progress-track w-12">
                          <div
                            className="h-full rounded-full bg-mint-400"
                            style={{ width: `${Math.max(3, video.breakoutProbability * 100)}%` }}
                          />
                        </div>
                        <span className="font-mono text-[9.5px] tabular text-fog-400">
                          {Math.round(video.breakoutProbability * 100)}%
                        </span>
                      </div>
                    </td>
                    <td className="tbody-cell w-8 pr-4 text-right">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onSelect(video);
                        }}
                        className="text-fog-600 transition-colors hover:text-lime-300"
                        aria-label={`Open dossier for ${video.title}`}
                      >
                        <ArrowUpRight size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr,1fr]">
        <section className="panel p-4">
          <PanelHeading
            eyebrow="Calibration"
            title="How the model earns its confidence"
            description={summary.backtest.method}
            action={<ShieldCheck size={15} className="text-mint-300" />}
          />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ForecastStat label="Holdout MAPE" value={summary.backtest.mape === null ? "—" : formatPercent(summary.backtest.mape)} />
            <ForecastStat label="Median error" value={summary.backtest.medianError === null ? "—" : formatPercent(summary.backtest.medianError)} accent />
            <ForecastStat label="Validation samples" value={String(summary.backtest.sampleSize)} />
            <ForecastStat label="Damping scale" value={summary.calibration.scale.toFixed(2)} />
          </div>
          <div className="mt-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-fog-500">Forecast confidence mix</span>
              <span className="font-mono text-[8.5px] text-fog-600">{confidenceTotal} signals</span>
            </div>
            <div className="flex h-2 overflow-hidden rounded-full bg-white/[0.05]">
              <span className="bg-lime-400" style={{ width: `${(confidenceMix.high / confidenceTotal) * 100}%` }} />
              <span className="bg-amber-400" style={{ width: `${(confidenceMix.medium / confidenceTotal) * 100}%` }} />
              <span className="bg-fog-600" style={{ width: `${(confidenceMix.low / confidenceTotal) * 100}%` }} />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[8.5px] uppercase tracking-[0.08em] text-fog-500">
              <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-lime-400" />High {confidenceMix.high}</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" />Medium {confidenceMix.medium}</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-fog-600" />Low {confidenceMix.low}</span>
            </div>
          </div>
          <p className="mt-3 text-[10.5px] leading-relaxed text-fog-500">
            Intervals widen with horizon and shrink with more snapshot history. Cumulative views are floored at the
            current value, so a cooling signal projects flat rather than negative.
          </p>
        </section>

        <section className="panel p-4">
          <PanelHeading eyebrow="Method" title="What the forecast can and cannot see" />
          <div className="mt-3 space-y-3">
            <MethodRow icon={BarChart3} title="Observed curve" body="Momentum is a robust log-growth rate from recent cumulative view snapshots, capped to avoid weekend and launch spikes." />
            <MethodRow icon={LineChart} title="Damped projection" body="Growth decays as the horizon extends. The scale is selected from a grid that minimises holdout median error." />
            <MethodRow icon={Crosshair} title="What it ignores" body="Algorithm changes, competitor uploads, paid promotion, seasonality and external events. Treat projections as directional, not guaranteed." />
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-400/15 bg-amber-400/[0.045] px-3 py-2.5">
            <Gauge size={12} className="shrink-0 text-amber-400" />
            <p className="text-[10px] leading-relaxed text-fog-400">
              Demo histories are synthetic. Live forecasts become more reliable after a few days of snapshot collection.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function ForecastStat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-white/[0.055] bg-white/[0.02] px-2.5 py-2">
      <div className="font-mono text-[8px] uppercase tracking-[0.11em] text-fog-600">{label}</div>
      <div className={`mt-1 font-mono text-[12px] font-semibold tabular ${accent ? "text-lime-300" : "text-fog-100"}`}>
        {value}
      </div>
    </div>
  );
}

function MethodRow({
  icon: Icon,
  title,
  body
}: {
  icon: typeof BarChart3;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-white/[0.06] bg-white/[0.025] text-fog-400">
        <Icon size={11} />
      </span>
      <div>
        <div className="text-[11px] font-semibold text-fog-200">{title}</div>
        <p className="mt-0.5 text-[10px] leading-relaxed text-fog-500">{body}</p>
      </div>
    </div>
  );
}
