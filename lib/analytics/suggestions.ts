import type { CategoryInsight, KeywordInsight, RegionInsight, Suggestion, TrendVideo } from "../types";
import { clamp, median, round, slugify, smartCaseTerm } from "../utils";

interface SuggestionInput {
  videos: TrendVideo[];
  keywords: KeywordInsight[];
  categories: CategoryInsight[];
  regions: RegionInsight[];
}

interface IdeaTemplate {
  angle: string;
  format: "Short" | "Long-form";
  title: (keyword: string, region: string) => string;
  hook: string;
}

const TEMPLATES: IdeaTemplate[] = [
  {
    angle: "30-day experiment",
    format: "Long-form",
    title: (keyword) => `I tried ${keyword} for 30 days — here's what actually happened`,
    hook: "Open with the messy before-state. Show the first failure by 0:08, then the turning point and the measurable result."
  },
  {
    angle: "Myth-buster",
    format: "Short",
    title: (keyword) => `The ${keyword} myth that needs to die`,
    hook: "Lead with the claim everyone repeats, break it in one sentence, then show the evidence that flips the frame."
  },
  {
    angle: "Rapid explainer",
    format: "Long-form",
    title: (keyword) => `The ${keyword} story, explained without the hype`,
    hook: "Start at the moment everything changed, then work backwards. Keep one visual anchor on screen the whole time."
  },
  {
    angle: "Tier list",
    format: "Long-form",
    title: (keyword) => `Ranking every ${keyword} era of 2026`,
    hook: "Cold open on the most controversial ranking. Put the obvious winner last to hold retention through the middle."
  },
  {
    angle: "Field guide",
    format: "Short",
    title: (keyword) => `3 things nobody tells you about ${keyword}`,
    hook: "Each of the three points gets a hard visual proof cut. No intro — the first claim lands in 1.5 seconds."
  },
  {
    angle: "Origin story",
    format: "Long-form",
    title: (keyword) => `How ${keyword} became the internet's main character`,
    hook: "Use a chronological cold-open montage, then introduce the unlikely turning point at the 20-second mark."
  },
  {
    angle: "Local lens",
    format: "Short",
    title: (keyword, region) => `Why ${region} is leading the ${keyword} wave`,
    hook: "Open on a location-specific detail and zoom out. Local proof first, global implication second."
  },
  {
    angle: "Data contrarian",
    format: "Long-form",
    title: (keyword) => `The ${keyword} shift looks overhyped — until you see the numbers`,
    hook: "Put the surprising chart on screen before you explain it. Let the audience sit with the contradiction."
  },
  {
    angle: "Behind the curve",
    format: "Short",
    title: (keyword) => `The ${keyword} shift is happening faster than you think`,
    hook: "Three fast cuts, one stat per cut, then a single question that pulls viewers into the comments."
  },
  {
    angle: "Practical test",
    format: "Long-form",
    title: (keyword) => `Does ${keyword} actually work? I put it to the test`,
    hook: "Show the final result for two seconds, rewind, then document the process without hiding the failures."
  }
];

function targetRegion(
  matching: TrendVideo[],
  regions: RegionInsight[],
  categoryId: string
): { code: string; name: string } {
  const scores = new Map<string, { total: number; count: number }>();
  for (const video of matching) {
    for (const region of video.regions) {
      const current = scores.get(region) ?? { total: 0, count: 0 };
      current.total += video.trendScore;
      current.count += 1;
      scores.set(region, current);
    }
  }

  const ranked = [...scores.entries()]
    .map(([code, value]) => {
      const insight = regions.find((region) => region.code === code);
      const marketBoost = (insight?.opportunity ?? 0) * 0.1;
      const categoryBoost = insight?.topCategoryId === categoryId ? 3.5 : 0;
      return {
        code,
        name: insight?.name ?? code,
        score: value.total / value.count + marketBoost + categoryBoost
      };
    })
    .sort((a, b) => b.score - a.score);

  if (ranked[0]) return { code: ranked[0].code, name: ranked[0].name };
  const fallback = regions[0];
  return { code: fallback?.code ?? "US", name: fallback?.name ?? "United States" };
}

function niceViews(value: number): number {
  if (value >= 1_000_000) return Math.round(value / 100_000) * 100_000;
  if (value >= 100_000) return Math.round(value / 10_000) * 10_000;
  if (value >= 10_000) return Math.round(value / 1_000) * 1_000;
  return Math.max(1_000, Math.round(value / 500) * 500);
}

export function buildSuggestions({ videos, keywords, categories, regions }: SuggestionInput): Suggestion[] {
  if (!keywords.length) return [];

  const categoryMap = new Map(categories.map((category) => [category.categoryId, category]));
  const chosen: KeywordInsight[] = [];
  const seen = new Set<string>();

  const ranked = [...keywords].sort((a, b) => {
    const aBoost = a.direction === "rising" ? 12 : a.direction === "steady" ? 4 : 0;
    const bBoost = b.direction === "rising" ? 12 : b.direction === "steady" ? 4 : 0;
    return b.opportunity + bBoost - (a.opportunity + aBoost);
  });

  for (const keyword of ranked) {
    const key = keyword.term.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    chosen.push(keyword);
    if (chosen.length >= 8) break;
  }

  const suggestions: Suggestion[] = [];

  chosen.forEach((keyword, index) => {
    const template = TEMPLATES[index % TEMPLATES.length];
    const matching = videos.filter((video) => {
      const haystack = `${video.title} ${video.tags.join(" ")} ${video.description}`.toLowerCase();
      return haystack.includes(keyword.term);
    });
    const region = targetRegion(matching.length ? matching : videos, regions, keyword.categoryId);
    const category = categoryMap.get(keyword.categoryId);
    const categoryName = category?.name ?? keyword.categoryName;
    const format = template.format;

    const incremental = matching
      .map((video) => {
        const forecast = video.forecasts.find((item) => item.horizonDays === 7);
        return forecast ? Math.max(0, forecast.predictedViews - video.views) : 0;
      })
      .filter((value) => value > 0);
    const fallbackBase = (category?.viewsPerDay ?? 120_000) * 7 * (format === "Short" ? 1.25 : 1);
    const base = Math.max(2_000, (incremental.length ? median(incremental) : fallbackBase) * 0.45);
    const low = niceViews(base * 0.55);
    const high = niceViews(base * 2.15 + 8_000);

    const confidence = Math.round(
      clamp(
        keyword.opportunity * 0.55 +
          keyword.avgScore * 0.25 +
          Math.min(100, keyword.count * 9) * 0.2,
        42,
        96
      )
    );

    const hashtags = [
      `#${slugify(keyword.term)}`,
      `#${slugify(categoryName)}`,
      format === "Short" ? "#shorts" : "#trending",
      "#2026"
    ].filter((tag, tagIndex, list) => tag.length > 1 && list.indexOf(tag) === tagIndex);

    const growthPct = round(keyword.avgMomentum * 100, 1);
    const rationale = `${keyword.count} matching signal${keyword.count === 1 ? "" : "s"} · ${
      growthPct >= 0 ? "+" : ""
    }${growthPct}% daily growth · ${keyword.regionSpread} region${keyword.regionSpread === 1 ? "" : "s"} · strongest in ${region.name}.`;

    const displayTerm = smartCaseTerm(keyword.term);
    const rawTitle = template.title(displayTerm, region.name);
    const title =
      rawTitle[0] === rawTitle[0].toLowerCase() ? rawTitle[0].toUpperCase() + rawTitle.slice(1) : rawTitle;

    suggestions.push({
      id: `idea-${slugify(keyword.term)}-${index}`,
      title,
      angle: template.angle,
      hook: template.hook,
      format,
      targetRegion: region.code,
      targetRegionName: region.name,
      targetCategory: categoryName,
      targetCategoryId: keyword.categoryId,
      keywords: [keyword.term],
      hashtags,
      opportunity: round(
        clamp(keyword.opportunity + (keyword.direction === "rising" ? 6 : 0), 0, 100),
        1
      ),
      confidence,
      rationale,
      estimatedViewsLow: low,
      estimatedViewsHigh: high
    });
  });

  return suggestions.sort((a, b) => b.opportunity - a.opportunity);
}
