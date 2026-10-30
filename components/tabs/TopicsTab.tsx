"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, Clock3, Flame, Lightbulb, Radio, Sparkles, Tag, TrendingUp } from "lucide-react";
import { formatCompact, formatPercent, directionInfo } from "@/lib/format";
import type { AnalysisResult, Direction, TrendVideo } from "@/lib/types";
import { TimingHeatmap } from "../charts";
import { StatCard } from "../StatCard";
import { Badge, CategoryGlyph, PanelHeading, SectionHeader } from "../ui";

export function TopicsTab({
  result,
  onSelect
}: {
  result: AnalysisResult;
  onSelect: (video: TrendVideo) => void;
}) {
  const { insights, videos } = result;
  const [filter, setFilter] = useState<Direction | "all">("all");
  const videosById = useMemo(() => new Map(videos.map((video) => [video.id, video])), [videos]);

  const keywords = useMemo(() => {
    const all = [...insights.keywords].sort((a, b) => b.opportunity - a.opportunity);
    return filter === "all" ? all : all.filter((keyword) => keyword.direction === filter);
  }, [insights.keywords, filter]);

  const bestTiming = [...insights.timing]
    .filter((cell) => cell.count > 0)
    .sort((a, b) => b.avgScore - a.avgScore)[0];
  const topCategory = insights.categories[0];
  const rising = insights.keywords.filter((keyword) => keyword.direction === "rising").length;

  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Topic & timing intelligence"
        title="The language of the next wave"
        description="Keywords are extracted from titles, tags and descriptions, then scored for momentum, spread and whitespace. Timing reflects UTC publish windows of the underlying signals."
        action={<Badge variant="lime" dot>{insights.keywords.length} terms tracked</Badge>}
      />

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <StatCard
          label="Rising keywords"
          value={rising}
          suffix={`/ ${insights.keywords.length}`}
          hint="Positive momentum across matched signals"
          icon={TrendingUp}
        />
        <StatCard
          label="Best publish window"
          value={bestTiming ? `${bestTiming.dayLabel} ${bestTiming.hourLabel.split("–")[0]}:00` : "—"}
          hint={bestTiming ? `UTC · avg signal ${bestTiming.avgScore.toFixed(1)}` : "No timing data"}
          icon={Clock3}
          accent="#4ae3c6"
        />
        <StatCard
          label="Top category"
          value={topCategory?.name ?? "—"}
          hint={topCategory ? `${topCategory.count} signals · ${formatCompact(topCategory.viewsPerDay)}/day` : "No data"}
          icon={Flame}
          accent="#ffbd5c"
        />
        <StatCard
          label="Short-form share"
          value={`${insights.summary.shortShare}%`}
          hint={`Median signal age ${insights.summary.medianAgeDays}d`}
          icon={Radio}
          accent="#9b8cff"
        />
      </div>

      <section className="panel overflow-hidden">
        <div className="p-4 pb-3">
          <PanelHeading
            eyebrow="Keyword opportunity"
            title="Terms with the most headroom"
            description="Opportunity combines signal quality, momentum, market spread and how little competition the term currently has."
            action={
              <div className="flex rounded-lg border border-white/[0.08] bg-ink-950/50 p-0.5">
                {(["all", "rising", "steady", "cooling"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilter(value)}
                    className={`rounded-md px-2 py-1 font-mono text-[8.5px] uppercase tracking-[0.06em] transition-colors ${
                      filter === value ? "bg-white/[0.09] text-fog-100" : "text-fog-500 hover:text-fog-200"
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            }
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="thead-cell w-10 pl-4">#</th>
                <th className="thead-cell">Term</th>
                <th className="thead-cell hidden md:table-cell">Category</th>
                <th className="thead-cell">Signals</th>
                <th className="thead-cell hidden lg:table-cell">Markets</th>
                <th className="thead-cell hidden sm:table-cell">Momentum</th>
                <th className="thead-cell">Opportunity</th>
                <th className="thead-cell w-8 pr-4" />
              </tr>
            </thead>
            <tbody>
              {keywords.map((keyword, index) => {
                const direction = directionInfo(keyword.direction);
                const topVideo = videosById.get(keyword.topVideoId);
                return (
                  <tr
                    key={keyword.term}
                    onClick={() => topVideo && onSelect(topVideo)}
                    className="data-row group cursor-pointer"
                  >
                    <td className="py-2.5 pl-4 pr-1">
                      <span className="font-mono text-[10px] tabular text-fog-600">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </td>
                    <td className="tbody-cell !py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-medium text-fog-100 group-hover:text-lime-200">
                          {keyword.term}
                        </span>
                        <span className={`rounded-full border px-1.5 py-0.5 font-mono text-[7.5px] uppercase tracking-[0.08em] ${direction.bg} ${direction.text}`}>
                          {direction.label}
                        </span>
                      </div>
                      <div className="mt-0.5 font-mono text-[8.5px] uppercase tracking-[0.1em] text-fog-600">
                        {formatCompact(keyword.totalViewsPerDay)}/day · {formatPercent(keyword.shareOfVoice)} share of voice
                      </div>
                    </td>
                    <td className="tbody-cell hidden md:table-cell">
                      <span className="inline-flex items-center gap-1.5 text-[10.5px] text-fog-400">
                        <CategoryGlyph categoryId={keyword.categoryId} size={11} />
                        {keyword.categoryName}
                      </span>
                    </td>
                    <td className="tbody-cell">
                      <span className="font-mono text-[11px] tabular text-fog-200">{keyword.count}</span>
                    </td>
                    <td className="tbody-cell hidden lg:table-cell">
                      <span className="font-mono text-[11px] tabular text-fog-300">{keyword.regionSpread}</span>
                    </td>
                    <td className="tbody-cell hidden sm:table-cell">
                      <span className={`font-mono text-[11px] tabular ${keyword.avgMomentum >= 0.3 ? "text-lime-300" : "text-fog-300"}`}>
                        {formatPercent(keyword.avgMomentum * 100, true)}
                      </span>
                    </td>
                    <td className="tbody-cell">
                      <div className="flex items-center gap-2">
                        <div className="progress-track w-14">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-lime-400/60 to-mint-400"
                            style={{ width: `${Math.max(3, keyword.opportunity)}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] font-semibold tabular text-lime-300">
                          {keyword.opportunity.toFixed(0)}
                        </span>
                      </div>
                    </td>
                    <td className="tbody-cell w-8 pr-4 text-right">
                      <ArrowUpRight size={12} className="inline text-fog-600 group-hover:text-lime-300" />
                    </td>
                  </tr>
                );
              })}
              {!keywords.length ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-[11px] text-fog-500">
                    No keywords in this direction. Try another filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.06] bg-white/[0.015] px-4 py-2.5">
          <Tag size={11} className="text-fog-500" />
          <span className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-fog-600">
            Click a row to open its strongest underlying signal
          </span>
          <span className="ml-auto font-mono text-[8.5px] uppercase tracking-[0.12em] text-fog-600">
            Stopwords & platform chrome removed
          </span>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.3fr,1fr]">
        <section className="panel p-4">
          <PanelHeading
            eyebrow="Publish timing"
            title="When qualified signals go live"
            description="Average signal score by UTC publish slot. Use this as a testing window, not a guarantee."
            action={<Badge variant="neutral">UTC</Badge>}
          />
          <div className="mt-4">
            <TimingHeatmap cells={insights.timing} />
          </div>
        </section>

        <section className="panel p-4">
          <PanelHeading
            eyebrow="Category performance"
            title="Formats winning attention"
            description="Share of qualified signals, average score and short-form composition."
          />
          <div className="mt-4 space-y-3">
            {insights.categories.slice(0, 8).map((category, index) => (
              <div key={category.categoryId}>
                <div className="mb-1 flex items-center gap-2">
                  <span className="w-3 font-mono text-[8px] text-fog-600">{String(index + 1).padStart(2, "0")}</span>
                  <CategoryGlyph categoryId={category.categoryId} size={12} />
                  <span className="min-w-0 flex-1 truncate text-[11px] text-fog-200">{category.name}</span>
                  <span className="font-mono text-[9px] tabular text-fog-500">
                    {category.count} · {category.avgScore.toFixed(0)}
                  </span>
                  <span className="w-8 text-right font-mono text-[8.5px] text-fog-600">{category.share}%</span>
                </div>
                <div className="ml-5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(3, category.avgScore)}%`,
                      backgroundColor: category.color,
                      opacity: 0.78
                    }}
                  />
                </div>
                <div className="ml-5 mt-1 flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.08em] text-fog-600">
                  <span>{formatCompact(category.viewsPerDay)} views/day</span>
                  <span>·</span>
                  <span>{category.shortShare}% shorts</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="callout callout-info">
          <Lightbulb size={15} className="mt-0.5 shrink-0 text-sky-300" />
          <p>
            <span className="font-semibold text-fog-100">Read the spread, not just the rank.</span> A term with three
            markets and moderate momentum is usually safer to scale than a single-market spike at the top of the table.
          </p>
        </div>
        <div className="callout callout-note">
          <Sparkles size={15} className="mt-0.5 shrink-0 text-lime-300" />
          <p>
            <span className="font-semibold text-fog-100">Turn a term into a shoot.</span> The playbook pairs each
            high-opportunity keyword with a format, hook, target market and estimated view range.
          </p>
        </div>
      </div>
    </div>
  );
}
