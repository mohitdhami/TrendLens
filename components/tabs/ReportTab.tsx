"use client";

import { ArrowUpRight, Download, FileJson, FileText, ShieldAlert, SlidersHorizontal, Table2 } from "lucide-react";
import { CATEGORY_MAP, REGION_MAP } from "@/lib/constants";
import { formatCompact, formatDate, formatPercent } from "@/lib/format";
import type { AnalysisResult, TrendVideo } from "@/lib/types";
import { Badge, CategoryGlyph, CopyButton, PanelHeading, RegionFlags, SectionHeader } from "../ui";

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function buildCsv(result: AnalysisResult): string {
  const header = [
    "rank",
    "title",
    "channel",
    "category",
    "markets",
    "format",
    "published_at",
    "age_days",
    "views",
    "views_per_day",
    "engagement_rate",
    "momentum",
    "trend_score",
    "breakout_probability",
    "forecast_7d",
    "forecast_7d_low",
    "forecast_7d_high",
    "trajectory",
    "source",
    "url"
  ];
  const rows = result.videos.map((video) => {
    const forecast = video.forecasts.find((item) => item.horizonDays === 7);
    return [
      video.rank,
      video.title,
      video.channelTitle,
      CATEGORY_MAP.get(video.categoryId)?.name ?? "General",
      video.regions.join("|"),
      video.format,
      video.publishedAt,
      video.ageDays.toFixed(2),
      video.views,
      Math.round(video.viewsPerDay),
      video.engagementRate.toFixed(2),
      video.momentum.toFixed(4),
      video.trendScore.toFixed(1),
      video.breakoutProbability.toFixed(3),
      forecast?.predictedViews ?? "",
      forecast?.low ?? "",
      forecast?.high ?? "",
      video.trajectory,
      video.source,
      video.source === "live" ? `https://www.youtube.com/watch?v=${video.id}` : ""
    ];
  });
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function buildMarkdown(result: AnalysisResult): string {
  const { insights, meta } = result;
  const summary = insights.summary;
  const lines: string[] = [
    "# TrendLens signal report",
    "",
    `**Generated:** ${formatDate(meta.generatedAt)}  `,
    `**Model:** ${meta.modelVersion}  `,
    `**Source:** ${meta.source === "live" ? "YouTube Data API regional charts" : "Deterministic demo dataset"}  `,
    `**Markets:** ${meta.regions.map((code) => REGION_MAP.get(code)?.name ?? code).join(", ")}  `,
    `**Precision:** ${meta.precision}/100 · **Signals:** ${summary.analyzed} of ${meta.filtered} candidates`,
    ""
  ];

  if (meta.warning) lines.push(`> Warning: ${meta.warning}`, "");

  lines.push(
    "## Executive summary",
    "",
    `${summary.analyzed} signals cleared the precision gate from ${meta.filtered} candidates (${summary.signalRate}% survival). ${summary.topCategory} leads the qualified set with ${summary.risingKeywords} rising keywords. ${summary.topRegionName} is the top signal market, and ${summary.multiRegionCount} signals are charting in two or more selected markets.`,
    "",
    "## Top signals",
    "",
    "| # | Signal | Score | Markets | 7-day forecast |",
    "|---|--------|-------|---------|----------------|"
  );

  for (const video of result.videos.slice(0, 10)) {
    const forecast = video.forecasts.find((item) => item.horizonDays === 7);
    lines.push(
      `| ${video.rank} | ${video.title.replace(/\|/g, "\\|")} | ${video.trendScore.toFixed(1)} | ${video.regions.join(", ")} | ${
        forecast ? `${formatCompact(forecast.predictedViews)} (${formatCompact(forecast.low)}–${formatCompact(forecast.high)})` : "—"
      } |`
    );
  }

  lines.push("", "## Market opportunities", "", "| Market | Opportunity | Avg score | Breakouts | Top category |", "|--------|-------------|-----------|-----------|--------------|");
  for (const region of insights.regions) {
    lines.push(
      `| ${region.name} | ${region.opportunity.toFixed(0)} | ${region.avgScore.toFixed(1)} | ${region.breakoutCount} | ${region.topCategoryName} |`
    );
  }

  lines.push("", "## Rising keywords", "");
  const rising = insights.keywords.filter((keyword) => keyword.direction === "rising").slice(0, 10);
  if (rising.length) {
    for (const keyword of rising) {
      lines.push(
        `- **${keyword.term}** — ${keyword.count} signal(s), ${keyword.regionSpread} market(s), opportunity ${keyword.opportunity.toFixed(0)}, momentum ${formatPercent(keyword.avgMomentum * 100, true)}/day`
      );
    }
  } else {
    lines.push("- No rising keywords identified in this scan.");
  }

  lines.push("", "## Playbook", "");
  for (const idea of insights.suggestions.slice(0, 5)) {
    lines.push(
      `### ${idea.title}`,
      `- **Format:** ${idea.format} · **Market:** ${idea.targetRegionName} · **Category:** ${idea.targetCategory}`,
      `- **Hook:** ${idea.hook}`,
      `- **Why now:** ${idea.rationale}`,
      `- **Estimated views:** ${formatCompact(idea.estimatedViewsLow)}–${formatCompact(idea.estimatedViewsHigh)}`,
      ""
    );
  }

  lines.push(
    "## Forecast calibration",
    "",
    `Walk-forward holdout median error: ${
      insights.forecastSummary.backtest.medianError === null ? "not available" : `${insights.forecastSummary.backtest.medianError}%`
    }. MAPE: ${
      insights.forecastSummary.backtest.mape === null ? "not available" : `${insights.forecastSummary.backtest.mape}%`
    }. Validation samples: ${insights.forecastSummary.backtest.sampleSize}. Damping scale: ${insights.forecastSummary.calibration.scale.toFixed(2)}.`,
    "",
    "## Methodology",
    "",
    "TrendLens merges regional YouTube charts, filters by hard constraints, scores each candidate on percentile velocity, momentum, engagement, freshness, cross-market reach and keyword relevance, then applies a precision-dependent weight profile and signal cap. Forecasts use a damped power-law momentum model with 80% intervals and auto-calibrated damping.",
    "",
    "## Limitations",
    "",
    "- Demo mode uses deterministic synthetic signals and histories, clearly labelled in the app.",
    "- Live mode reads regional most-popular charts at snapshot time, not real-time analytics.",
    "- Forecasts are directional and do not account for promotions, algorithm changes or external events.",
    "- Opportunity and breakout scores are relative to the selected markets and precision settings.",
    ""
  );

  return lines.join("\n");
}

export function ReportTab({
  result,
  onSelect
}: {
  result: AnalysisResult;
  onSelect: (video: TrendVideo) => void;
}) {
  const { insights, meta } = result;
  const summary = insights.summary;
  const topSignals = result.videos.slice(0, 4);
  const markdown = buildMarkdown(result);
  const risingKeywords = insights.keywords.filter((keyword) => keyword.direction === "rising").slice(0, 6);

  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Report & export"
        title="Turn the scan into a briefing"
        description="A shareable snapshot of signal quality, market opportunity, keyword momentum and the content playbook."
        action={
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => downloadFile("trendlens-report.json", JSON.stringify(result, null, 2), "application/json")}
              className="btn-secondary !px-2.5 !py-1.5 !text-[10.5px]"
            >
              <FileJson size={12} />
              JSON
            </button>
            <button
              type="button"
              onClick={() => downloadFile("trendlens-signals.csv", buildCsv(result), "text/csv;charset=utf-8")}
              className="btn-secondary !px-2.5 !py-1.5 !text-[10.5px]"
            >
              <Table2 size={12} />
              CSV
            </button>
            <button
              type="button"
              onClick={() => downloadFile("trendlens-brief.md", markdown, "text/markdown;charset=utf-8")}
              className="btn-primary !px-2.5 !py-1.5 !text-[10.5px]"
            >
              <Download size={12} />
              Markdown
            </button>
          </div>
        }
      />

      {meta.warning ? (
        <div className="callout callout-warn">
          <ShieldAlert size={15} className="mt-0.5 shrink-0" />
          <p>{meta.warning}</p>
        </div>
      ) : null}

      {meta.note ? (
        <div className="callout callout-info">
          <SlidersHorizontal size={15} className="mt-0.5 shrink-0" />
          <p>{meta.note}</p>
        </div>
      ) : null}

      <article className="panel relative overflow-hidden p-4 sm:p-5">
        <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-lime-400/50 to-transparent" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-lime-400/[0.06] blur-3xl" />
        <div className="relative">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-fog-600">TrendLens intelligence brief</div>
              <h2 className="mt-1.5 font-display text-2xl font-semibold tracking-tight text-fog-100">
                Signal scan · {formatDate(meta.generatedAt)}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Badge variant={meta.source === "live" ? "sky" : "violet"} dot>
                  {meta.source === "live" ? "Live YouTube charts" : "Demo dataset"}
                </Badge>
                <Badge variant="neutral">{meta.modelVersion}</Badge>
                <Badge variant="neutral">Precision {meta.precision}</Badge>
                {meta.cached ? <Badge variant="amber">Cache hit</Badge> : null}
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-fog-600">Markets</div>
              <div className="mt-1 flex justify-end">
                <RegionFlags codes={meta.regions} max={6} />
              </div>
            </div>
          </div>

          <p className="mt-4 max-w-4xl text-[12.5px] leading-relaxed text-fog-300">
            <span className="font-semibold text-fog-100">
              {summary.analyzed} signals cleared the precision gate
            </span>{" "}
            from {meta.filtered} candidates across {summary.regions} markets — a {summary.signalRate}% survival rate.
            {" "}{summary.topCategory} leads the qualified set, {summary.risingKeywords} keywords are rising, and{" "}
            {summary.multiRegionCount} signals are charting in two or more selected markets. {summary.topRegionName} is
            the strongest market by signal quality, while the median qualified signal is {summary.medianAgeDays} days old.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <ReportStat label="Avg signal score" value={summary.avgTrendScore.toFixed(1)} />
            <ReportStat label="Median engagement" value={formatPercent(summary.medianEngagement)} />
            <ReportStat label="Breakout candidates" value={String(insights.forecastSummary.breakoutCandidates)} />
            <ReportStat label="Projected 7d reach" value={formatCompact(insights.forecastSummary.expected7dViews)} />
          </div>
        </div>
      </article>

      <div className="grid gap-4 xl:grid-cols-[1.25fr,1fr]">
        <section className="panel p-4">
          <PanelHeading
            eyebrow="Highest priority"
            title="Signals to act on now"
            description="Top-ranked qualified signals with their 7-day projection."
            action={
              <CopyButton
                text={topSignals
                  .map(
                    (video) =>
                      `${video.rank}. ${video.title} — score ${video.trendScore.toFixed(1)}, ${video.regions.join("/")}`
                  )
                  .join("\n")}
                label="Copy list"
              />
            }
          />
          <div className="mt-3 space-y-1">
            {topSignals.map((video) => {
              const forecast = video.forecasts.find((item) => item.horizonDays === 7);
              const category = CATEGORY_MAP.get(video.categoryId);
              return (
                <button
                  key={video.id}
                  type="button"
                  onClick={() => onSelect(video)}
                  className="flex w-full items-center gap-2.5 rounded-lg border border-transparent px-2 py-2.5 text-left transition-colors hover:border-white/[0.07] hover:bg-white/[0.03]"
                >
                  <span className="w-5 shrink-0 font-mono text-[10px] text-fog-600">#{video.rank}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11.5px] font-medium text-fog-100">{video.title}</span>
                    <span className="mt-0.5 flex items-center gap-1.5 font-mono text-[8.5px] uppercase tracking-[0.08em] text-fog-600">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: category?.color ?? "#8495a5" }} />
                      {category?.name ?? "General"} · {video.regions.length} markets
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-mono text-[10.5px] font-semibold tabular text-fog-200">
                      {forecast ? formatCompact(forecast.predictedViews) : "—"}
                    </span>
                    <span className="block font-mono text-[8px] uppercase tracking-[0.08em] text-fog-600">7d views</span>
                  </span>
                  <span className="w-8 shrink-0 text-right font-mono text-[11px] font-semibold tabular text-lime-300">
                    {video.trendScore.toFixed(0)}
                  </span>
                  <ArrowUpRight size={11} className="shrink-0 text-fog-600" />
                </button>
              );
            })}
          </div>
        </section>

        <section className="panel p-4">
          <PanelHeading
            eyebrow="Market ranking"
            title="Opportunity by market"
            description="Relative to this scan's selected set."
          />
          <div className="mt-3 overflow-hidden rounded-lg border border-white/[0.06]">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="thead-cell !px-2.5 !py-2">Market</th>
                  <th className="thead-cell !px-2 !py-2 text-right">Opp.</th>
                  <th className="thead-cell !px-2 !py-2 text-right">Score</th>
                  <th className="thead-cell !px-2 !py-2 text-right">Breakouts</th>
                </tr>
              </thead>
              <tbody>
                {insights.regions.map((region) => (
                  <tr key={region.code} className="border-t border-white/[0.045]">
                    <td className="px-2.5 py-2">
                      <span className="flex items-center gap-1.5 text-[10.5px] text-fog-300">
                        <span>{REGION_MAP.get(region.code)?.flag ?? "🌐"}</span>
                        <span className="truncate">{region.name}</span>
                      </span>
                    </td>
                    <td className="px-2 py-2 text-right font-mono text-[10px] font-semibold tabular text-lime-300">
                      {region.opportunity.toFixed(0)}
                    </td>
                    <td className="px-2 py-2 text-right font-mono text-[10px] tabular text-fog-400">
                      {region.avgScore.toFixed(1)}
                    </td>
                    <td className="px-2 py-2 text-right font-mono text-[10px] tabular text-fog-400">
                      {region.breakoutCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr,1fr]">
        <section className="panel p-4">
          <PanelHeading
            eyebrow="Keyword pulse"
            title="Rising terms in this scan"
            action={<Badge variant="lime" dot>{summary.risingKeywords} rising</Badge>}
          />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {risingKeywords.map((keyword) => (
              <span
                key={keyword.term}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.025] px-2.5 py-1.5"
              >
                <span className="text-[10.5px] text-fog-200">{keyword.term}</span>
                <span className="font-mono text-[8.5px] text-lime-300">{formatPercent(keyword.avgMomentum * 100, true)}</span>
              </span>
            ))}
            {!risingKeywords.length ? (
              <span className="text-[11px] text-fog-500">No rising terms in this scan.</span>
            ) : null}
          </div>
          <div className="mt-3 space-y-2 border-t border-white/[0.06] pt-3">
            {insights.suggestions.slice(0, 3).map((idea) => (
              <div key={idea.id} className="flex items-center gap-2">
                <CategoryGlyph categoryId={idea.targetCategoryId} size={11} />
                <span className="min-w-0 flex-1 truncate text-[10.5px] text-fog-300">{idea.title}</span>
                <span className="shrink-0 font-mono text-[9px] text-fog-500">{idea.estimatedViewsLow > 0 ? formatCompact(idea.estimatedViewsHigh) : "—"}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel p-4">
          <PanelHeading
            eyebrow="Provenance & method"
            title="How this brief was produced"
            action={<FileText size={14} className="text-fog-500" />}
          />
          <p className="mt-3 text-[10.5px] leading-relaxed text-fog-400">
            {meta.source === "live"
              ? "Live regional YouTube most-popular charts were fetched with the YouTube Data API v3. View counts are snapshot values; momentum is inferred from collected history when available."
              : "The deterministic demo dataset simulates regional YouTube charts, cross-market memberships and daily view histories. Every demo signal is labelled in the interface."}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Provenance label="Candidates fetched" value={String(meta.fetched)} />
            <Provenance label="After hard filters" value={String(meta.filtered)} />
            <Provenance label="Precision gate cut" value={`${meta.gateThreshold}%`} />
            <Provenance label="Scan time" value={`${meta.durationMs}ms`} />
            <Provenance label="API calls" value={String(meta.apiCalls)} />
            <Provenance label="Signal cap" value={`${meta.matched} signals`} />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(["velocity", "momentum", "engagement", "freshness", "reach"] as const).map((key) => (
              <span key={key} className="rounded-md bg-white/[0.03] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.06em] text-fog-500">
                {key} {Math.round(meta.weights[key] * 100)}%
              </span>
            ))}
          </div>
        </section>
      </div>

      <section className="panel p-4">
        <PanelHeading
          eyebrow="Interpretation guardrails"
          title="Read this before acting"
          description="What the numbers mean, and where they stop being useful."
        />
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {[
            {
              title: "Relative, not absolute",
              body: "Signal, opportunity and breakout scores are ranked within this scan. Changing markets or precision changes the baseline."
            },
            {
              title: "Forecasts are directional",
              body: "The damped momentum model cannot see promotions, algorithm shifts or external events. Use the intervals, not just the point estimate."
            },
            {
              title: "Demo is labelled",
              body: "Synthetic signals are useful for exploring the workflow, but they are not evidence of real audience demand."
            },
            {
              title: "Cross-market is stronger",
              body: "A signal charting in several markets has more independent evidence behind it than a single-market spike."
            }
          ].map((item) => (
            <div key={item.title} className="rounded-lg border border-white/[0.055] bg-white/[0.02] p-3">
              <div className="text-[11px] font-semibold text-fog-200">{item.title}</div>
              <p className="mt-1 text-[10px] leading-relaxed text-fog-500">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.018] px-4 py-3">
        <FileText size={13} className="text-lime-300" />
        <p className="text-[11px] leading-relaxed text-fog-400">
          The Markdown export includes the executive summary, signal table, market ranking, keywords, playbook and methodology.
        </p>
        <div className="ml-auto flex items-center gap-1.5">
          <CopyButton text={markdown} label="Copy full brief" variant="secondary" />
          <button
            type="button"
            onClick={() => downloadFile("trendlens-brief.md", markdown, "text/markdown;charset=utf-8")}
            className="btn-secondary !px-3 !py-1.5 !text-[11px]"
          >
            <Download size={12} />
            Download .md
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.022] px-2.5 py-2">
      <div className="font-mono text-[8px] uppercase tracking-[0.1em] text-fog-600">{label}</div>
      <div className="mt-1 font-display text-[15px] font-semibold tabular text-fog-100">{value}</div>
    </div>
  );
}

function Provenance({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/[0.055] bg-white/[0.02] px-2.5 py-2">
      <div className="font-mono text-[7.5px] uppercase tracking-[0.1em] text-fog-600">{label}</div>
      <div className="mt-0.5 font-mono text-[10.5px] font-semibold tabular text-fog-200">{value}</div>
    </div>
  );
}
