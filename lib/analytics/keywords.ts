import { CATEGORIES, CATEGORY_MAP, STOPWORDS } from "../constants";
import type { Direction, KeywordInsight, TrendVideo } from "../types";
import { normalizeTerm, percentileRanks, round } from "../utils";

const TERM_REGEX = /[a-z0-9][a-z0-9'’\-]*/gi;
const ACRONYMS = new Set(["ai", "f1", "nba", "gta", "ev", "vr", "ar", "xr", "ui", "ux", "pc", "3d", "4k", "8k", "ml", "nft"]);

const GENERIC_TERMS = [
  "trending now", "trending", "creator economy", "official video", "new music", "live performance",
  "music review", "artist interview", "gameplay", "walkthrough", "esports", "behind the scenes",
  "study tips", "match recap", "how to", "day in the life", "lifestyle", "storytime", "breaking",
  "analysis", "explained", "reaction", "review", "highlights", "sketch", "stand up", "funny",
  "routine", "style", "diy", "vlog", "guide", "adventure", "build", "training", "rescue",
  "community", "impact", "nonprofit", "activism", "celeb", "celebrity", "sports", "gaming",
  "music", "comedy", "education", "learning", "technology", "science", "innovation", "film",
  "animation", "movie", "cars", "automotive", "pets", "animals", "travel", "news", "politics",
  "entertainment", "people", "blogs", "autos", "vehicles", "events", "nonprofits", "how-to",
  "shorts", "viral", "internet", "unreal", "episode", "season", "full", "ep", "part",
  "caught", "camera", "hidden", "history", "update", "changes", "everything", "actually",
  "hours", "trying", "until", "stops", "being", "race", "era", "starts", "truth", "moment",
  "myth", "field", "real", "numbers", "faster", "think", "week", "month", "world", "machine",
  "breakdown", "obsession", "main", "character", "tested", "test", "week", "spent", "mastering",
  "inside", "top", "best", "new", "reality", "show", "inside"
];

const BLOCKED = new Set<string>([
  ...STOPWORDS,
  ...GENERIC_TERMS,
  ...CATEGORIES.flatMap((category) => {
    const name = category.name.toLowerCase();
    return [name, ...name.split(/[^a-z0-9]+/g).filter(Boolean)];
  })
]);

function tokenize(text: string): string[] {
  const matches = text.toLowerCase().replace(/[’]/g, "'").match(TERM_REGEX) ?? [];
  return matches
    .map((token) => token.replace(/^['-]+|['-]+$/g, ""))
    .filter((token) => token.length > 0);
}

function isValidToken(token: string): boolean {
  if (BLOCKED.has(token) || STOPWORDS.has(token)) return false;
  if (/^\d+$/.test(token)) return false;
  if (token.length >= 3) return true;
  return ACRONYMS.has(token);
}

function addCandidate(set: Set<string>, raw: string): void {
  const term = normalizeTerm(raw).replace(/^#+/, "").replace(/^['-]+|['-]+$/g, "");
  if (!term || term.length < 2 || term.length > 48) return;
  if (BLOCKED.has(term)) return;
  const tokens = tokenize(term).filter(isValidToken);
  if (!tokens.length) return;
  if (/^\d+$/.test(term.replace(/\s+/g, ""))) return;
  set.add(term);
}

/**
 * Tags are the highest-signal vocabulary (they tend to be curated topic
 * phrases). Title unigrams are used as a fallback and title bigrams are only
 * kept when a tag already confirms the phrase — this avoids template noise.
 */
export function termsForVideo(video: TrendVideo, tagPhrases?: Set<string>): { tags: string[]; title: string[] } {
  const tagTerms = new Set<string>();
  const titleTerms = new Set<string>();
  const knownTags = tagPhrases ?? new Set<string>();

  for (const tag of video.tags) {
    addCandidate(tagTerms, normalizeTerm(tag));
  }
  if (!tagPhrases) {
    for (const tag of video.tags) knownTags.add(normalizeTerm(tag));
  }

  const titleTokens = tokenize(video.title).filter(isValidToken);
  for (const token of titleTokens) addCandidate(titleTerms, token);
  for (let index = 0; index < titleTokens.length - 1; index += 1) {
    const phrase = `${titleTokens[index]} ${titleTokens[index + 1]}`;
    if (knownTags.has(phrase)) addCandidate(titleTerms, phrase);
  }

  return { tags: [...tagTerms], title: [...titleTerms] };
}

interface TermGroup {
  term: string;
  videos: TrendVideo[];
  fromTag: boolean;
}

export function extractKeywords(
  videos: TrendVideo[],
  focusTerms: string[],
  maxResults = 18
): KeywordInsight[] {
  if (!videos.length) return [];

  const tagPhrases = new Set<string>();
  for (const video of videos) {
    for (const tag of video.tags) tagPhrases.add(normalizeTerm(tag));
  }

  const groups = new Map<string, TermGroup>();
  for (const video of videos) {
    const terms = termsForVideo(video, tagPhrases);
    for (const term of terms.tags) {
      const group = groups.get(term) ?? { term, videos: [], fromTag: true };
      group.videos.push(video);
      groups.set(term, group);
    }
    for (const term of terms.title) {
      const existing = groups.get(term);
      if (existing) {
        if (!existing.videos.includes(video)) existing.videos.push(video);
      } else {
        groups.set(term, { term, videos: [video], fromTag: false });
      }
    }
  }

  const focus = new Set(focusTerms.map(normalizeTerm).filter(Boolean));
  const tagMinimum = videos.length >= 30 ? 2 : 1;
  const titleMinimum = 3;
  const totalViewsPerDay = videos.reduce((sum, video) => sum + video.viewsPerDay, 0);

  const base: TermGroup[] = [];
  for (const group of groups.values()) {
    if (focus.has(group.term)) {
      base.push(group);
      continue;
    }
    if (group.fromTag) {
      if (group.videos.length >= tagMinimum) base.push(group);
    } else if (group.videos.length >= titleMinimum && group.term.split(" ").length === 1) {
      base.push(group);
    }
  }

  if (!base.length) {
    for (const group of groups.values()) {
      if (group.videos.length >= 1) base.push(group);
    }
  }
  if (!base.length) return [];

  const avgMomentums = base.map(
    (group) => group.videos.reduce((sum, video) => sum + video.momentum, 0) / group.videos.length
  );
  const momentumRanks = percentileRanks(avgMomentums);
  const volumeRanks = percentileRanks(base.map((group) => group.videos.length));
  const qualityRanks = percentileRanks(
    base.map((group) => group.videos.reduce((sum, video) => sum + video.trendScore, 0) / group.videos.length)
  );

  const rows = base.map((group, index) => {
    const count = group.videos.length;
    const avgScore = group.videos.reduce((sum, video) => sum + video.trendScore, 0) / count;
    const avgMomentum = avgMomentums[index];
    const spread = new Set(group.videos.flatMap((video) => video.regions)).size;
    const matchingVpd = group.videos.reduce((sum, video) => sum + video.viewsPerDay, 0);

    const categoryCounts = new Map<string, number>();
    for (const video of group.videos) {
      categoryCounts.set(video.categoryId, (categoryCounts.get(video.categoryId) ?? 0) + 1);
    }
    const categoryId = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "0";
    const topVideo = [...group.videos].sort((a, b) => b.trendScore - a.trendScore)[0];
    const directionRank = momentumRanks[index];
    const direction: Direction =
      avgMomentum >= 0.22
        ? "rising"
        : avgMomentum <= 0.035
          ? "cooling"
          : directionRank >= 70
            ? "rising"
            : directionRank <= 25
              ? "cooling"
              : "steady";

    return {
      term: group.term,
      count,
      share: (count / videos.length) * 100,
      avgScore,
      avgMomentum,
      direction,
      regionSpread: spread,
      shareOfVoice: totalViewsPerDay > 0 ? (matchingVpd / totalViewsPerDay) * 100 : 0,
      totalViewsPerDay: matchingVpd,
      opportunity: 0,
      categoryId,
      categoryName: CATEGORY_MAP.get(categoryId)?.name ?? "General",
      topVideoId: topVideo?.id ?? "",
      _volumeRank: volumeRanks[index],
      _qualityRank: qualityRanks[index],
      _momentumRank: directionRank,
      _phraseBonus: group.term.includes(" ") ? 3 : 0,
      _fromTag: group.fromTag
    };
  });

  const spreadRanks = percentileRanks(rows.map((row) => row.regionSpread));
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const opportunity =
      row._volumeRank * 0.26 +
      row._qualityRank * 0.34 +
      row._momentumRank * 0.24 +
      spreadRanks[index] * 0.16 +
      row._phraseBonus +
      (row._fromTag ? 3 : 0);
    row.opportunity = round(Math.min(100, opportunity), 1);
  }

  const phraseParents = rows.filter((row) => row.term.includes(" "));
  const deduped = rows.filter((row) => {
    if (focus.has(row.term)) return true;
    const rowTokens = row.term.split(" ");
    return !phraseParents.some((parent) => {
      if (parent === row) return false;
      const parentTokens = parent.term.split(" ");
      const isSubPhrase = rowTokens.every((token) => parentTokens.includes(token));
      return isSubPhrase && parent.count >= Math.max(2, row.count * 0.8);
    });
  });

  const sorted = deduped.sort((a, b) => b.opportunity - a.opportunity);
  const selected = sorted.slice(0, maxResults);

  for (const term of focus) {
    if (selected.some((row) => row.term === term)) continue;
    const existing = sorted.find((row) => row.term === term);
    if (existing) selected.push(existing);
  }

  return selected
    .sort((a, b) => b.opportunity - a.opportunity)
    .slice(0, maxResults + focus.size)
    .map(({ _volumeRank, _qualityRank, _momentumRank, _phraseBonus, _fromTag, ...row }) => ({
      ...row,
      share: round(row.share, 1),
      avgScore: round(row.avgScore, 1),
      avgMomentum: round(row.avgMomentum, 4),
      shareOfVoice: round(row.shareOfVoice, 1),
      totalViewsPerDay: Math.round(row.totalViewsPerDay)
    }));
}
