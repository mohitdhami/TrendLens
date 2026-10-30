"use client";

import { ArrowUpRight, CheckCircle2, Globe2, Lightbulb, Sparkles, Target, Timer, Wand2 } from "lucide-react";
import { CATEGORY_MAP, REGION_MAP } from "@/lib/constants";
import { formatCompact } from "@/lib/format";
import type { AnalysisResult, Suggestion } from "@/lib/types";
import { StatCard } from "../StatCard";
import { Badge, CategoryGlyph, CopyButton, SectionHeader } from "../ui";

function ideaCopy(idea: Suggestion): string {
  return [
    idea.title,
    "",
    `Format: ${idea.format}`,
    `Angle: ${idea.angle}`,
    `Target market: ${idea.targetRegionName} (${idea.targetRegion})`,
    `Category: ${idea.targetCategory}`,
    `Estimated views: ${formatCompact(idea.estimatedViewsLow)}–${formatCompact(idea.estimatedViewsHigh)}`,
    `Opportunity: ${idea.opportunity.toFixed(0)}/100 · Confidence: ${idea.confidence}%`,
    "",
    `Hook: ${idea.hook}`,
    "",
    `Why now: ${idea.rationale}`,
    "",
    `Keywords: ${idea.keywords.join(", ")}`,
    `Hashtags: ${idea.hashtags.join(" ")}`
  ].join("\n");
}

export function PlaybookTab({ result }: { result: AnalysisResult }) {
  const { insights } = result;
  const ideas = insights.suggestions;
  const top = ideas[0];
  const shortCount = ideas.filter((idea) => idea.format === "Short").length;
  const marketCount = new Set(ideas.map((idea) => idea.targetRegion)).size;

  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Content playbook"
        title="What to make next"
        description="Every idea is derived from a qualified keyword, then matched to a format, angle, hook and target market. Estimates are directional — not guarantees."
        action={<Badge variant="lime" dot>{ideas.length} ranked ideas</Badge>}
      />

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <StatCard
          label="Ready-to-shoot ideas"
          value={ideas.length}
          hint={`${shortCount} Shorts · ${ideas.length - shortCount} long-form`}
          icon={Lightbulb}
        />
        <StatCard
          label="Highest opportunity"
          value={top ? top.opportunity.toFixed(0) : "—"}
          suffix="/ 100"
          hint={top ? `${top.confidence}% confidence · ${top.format}` : "No ideas generated"}
          icon={Target}
          accent="#4ae3c6"
        />
        <StatCard
          label="Markets covered"
          value={marketCount}
          hint={top ? `Lead market: ${top.targetRegionName}` : "Broaden the market set"}
          icon={Globe2}
          accent="#9b8cff"
        />
        <StatCard
          label="Top view ceiling"
          value={top ? formatCompact(top.estimatedViewsHigh) : "—"}
          hint="Upper end of the modelled view range"
          icon={ArrowUpRight}
          accent="#ffbd5c"
        />
      </div>

      {ideas.length ? (
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {ideas.map((idea, index) => {
            const category = CATEGORY_MAP.get(idea.targetCategoryId);
            const region = REGION_MAP.get(idea.targetRegion);
            const accent = category?.color ?? "#c6ff4a";
            return (
              <article key={idea.id} className="panel relative flex flex-col overflow-hidden p-4">
                <span
                  className="absolute inset-x-0 top-0 h-px"
                  style={{ background: `linear-gradient(to right, transparent, ${accent}99, transparent)` }}
                />
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={idea.format === "Short" ? "mint" : "neutral"}>{idea.format}</Badge>
                    <Badge variant="neutral">
                      {region?.flag ?? "🌐"} {idea.targetRegionName}
                    </Badge>
                  </div>
                  <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fog-600">
                    #{String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                <div className="mt-2.5 flex items-center gap-1.5">
                  <CategoryGlyph categoryId={idea.targetCategoryId} size={11} />
                  <span className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-fog-500">
                    {idea.targetCategory} · {idea.angle}
                  </span>
                </div>
                <h3 className="mt-1.5 font-display text-[15px] font-semibold leading-snug tracking-tight text-fog-100">
                  {idea.title}
                </h3>

                <div className="mt-3 rounded-lg border border-white/[0.06] bg-ink-950/40 p-2.5">
                  <div className="mb-1 font-mono text-[8px] uppercase tracking-[0.14em] text-lime-300/80">Hook</div>
                  <p className="text-[10.5px] leading-relaxed text-fog-300">{idea.hook}</p>
                </div>

                <p className="mt-3 text-[10.5px] leading-relaxed text-fog-400">{idea.rationale}</p>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-white/[0.055] bg-white/[0.02] px-2.5 py-2">
                    <div className="font-mono text-[7.5px] uppercase tracking-[0.1em] text-fog-600">View range</div>
                    <div className="mt-0.5 font-mono text-[10.5px] font-semibold tabular text-fog-100">
                      {formatCompact(idea.estimatedViewsLow)}–{formatCompact(idea.estimatedViewsHigh)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/[0.055] bg-white/[0.02] px-2.5 py-2">
                    <div className="font-mono text-[7.5px] uppercase tracking-[0.1em] text-fog-600">Confidence</div>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span className="font-mono text-[10.5px] font-semibold tabular text-fog-100">{idea.confidence}%</span>
                      <span className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
                        <span className="block h-full rounded-full" style={{ width: `${idea.confidence}%`, backgroundColor: accent }} />
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1">
                  {idea.hashtags.map((hashtag) => (
                    <span key={hashtag} className="rounded-md bg-white/[0.035] px-1.5 py-0.5 font-mono text-[8.5px] text-fog-500">
                      {hashtag}
                    </span>
                  ))}
                </div>

                <div className="mt-auto flex items-center justify-between gap-2 border-t border-white/[0.06] pt-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent }} />
                    <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-fog-600">
                      Opportunity {idea.opportunity.toFixed(0)}
                    </span>
                  </div>
                  <CopyButton text={ideaCopy(idea)} label="Copy idea" copiedLabel="Idea copied" />
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="panel px-6 py-14 text-center">
          <Wand2 size={20} className="mx-auto text-fog-500" />
          <h3 className="mt-3 font-display text-base font-semibold text-fog-100">No playbook ideas yet</h3>
          <p className="mx-auto mt-1 max-w-md text-[12px] leading-relaxed text-fog-400">
            Ideas need at least one keyword with momentum. Lower precision or widen the market and category selection.
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.15fr,1fr]">
        <section className="panel p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-lime-400/15 bg-lime-400/[0.06] text-lime-300">
              <CheckCircle2 size={14} />
            </span>
            <div>
              <div className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-fog-600">Before you shoot</div>
              <h3 className="font-display text-[14px] font-semibold text-fog-100">Production checks</h3>
            </div>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {[
              { title: "Validate the source", body: "Open the underlying signal and confirm the topic is still rising in your target market." },
              { title: "Localize the proof", body: "Use a market-specific example in the first 10 seconds; generic hooks travel poorly." },
              { title: "Match the format", body: "Short ideas need a proof cut in the first 1.5s. Long-form needs a clear narrative turn." },
              { title: "Set the window", body: "Publish inside the timing window, then compare 48-hour retention against your baseline." }
            ].map((item) => (
              <div key={item.title} className="rounded-lg border border-white/[0.055] bg-white/[0.02] p-2.5">
                <div className="text-[10.5px] font-semibold text-fog-200">{item.title}</div>
                <p className="mt-1 text-[9.5px] leading-relaxed text-fog-500">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="panel flex flex-col p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-mint-400/15 bg-mint-400/[0.06] text-mint-300">
              <Timer size={14} />
            </span>
            <div>
              <div className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-fog-600">Operating note</div>
              <h3 className="font-display text-[14px] font-semibold text-fog-100">Ship one variable at a time</h3>
            </div>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-fog-400">
            Run each idea as a small test: same topic, one format change, one hook change. The engine tells you where
            attention is moving; it cannot tell you why an audience cares. That part is still your job.
          </p>
          <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
            <span className="chip !text-[9.5px]">
              <Sparkles size={9} className="text-lime-300" />
              {insights.keywords.length} source keywords
            </span>
            <span className="chip !text-[9.5px]">
              <ArrowUpRight size={9} className="text-mint-300" />
              {result.meta.modelVersion}
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
