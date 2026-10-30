import { CATEGORY_MAP, regionName } from "./constants";
import type { RawVideo, TimePoint, Trajectory } from "./types";
import { clamp, hashString, seededRandom, unique, weightedPick } from "./utils";

interface TopicSeed {
  keyword: string;
  categoryId: string;
  affinity?: string[];
  heat?: number;
}

const CATEGORY_TOPICS: Record<string, TopicSeed[]> = {
  "10": [
    { keyword: "afrobeats", categoryId: "10", affinity: ["NG", "GH", "ZA", "GB", "US", "FR"], heat: 0.88 },
    { keyword: "K-pop comeback", categoryId: "10", affinity: ["KR", "JP", "US", "TH", "PH", "ID", "BR"], heat: 0.92 },
    { keyword: "lo-fi beats", categoryId: "10", heat: 0.62 },
    { keyword: "country crossover", categoryId: "10", affinity: ["US", "CA", "AU", "GB"] },
    { keyword: "reggaeton", categoryId: "10", affinity: ["MX", "BR", "AR", "CO", "CL", "ES", "US"], heat: 0.86 },
    { keyword: "live session", categoryId: "10" },
    { keyword: "AI-generated music", categoryId: "10", affinity: ["US", "GB", "JP", "DE"], heat: 0.9 },
    { keyword: "vinyl revival", categoryId: "10", affinity: ["GB", "US", "DE", "AU"] },
    { keyword: "Bollywood soundtrack", categoryId: "10", affinity: ["IN", "PK", "BD", "AE"], heat: 0.84 },
    { keyword: "amapiano", categoryId: "10", affinity: ["ZA", "NG", "GB", "US"], heat: 0.78 }
  ],
  "20": [
    { keyword: "GTA 6", categoryId: "20", heat: 0.99 },
    { keyword: "Minecraft hardcore", categoryId: "20", heat: 0.8 },
    { keyword: "Valorant clutch", categoryId: "20", heat: 0.75 },
    { keyword: "speedrunning record", categoryId: "20" },
    { keyword: "indie horror game", categoryId: "20", heat: 0.72 },
    { keyword: "esports finals", categoryId: "20", affinity: ["KR", "US", "DE", "BR"], heat: 0.82 },
    { keyword: "retro handhelds", categoryId: "20", affinity: ["JP", "US", "GB"] },
    { keyword: "game dev devlog", categoryId: "20" }
  ],
  "24": [
    { keyword: "reality show finale", categoryId: "24", heat: 0.83 },
    { keyword: "celebrity interview", categoryId: "24", affinity: ["US", "GB", "IN"] },
    { keyword: "movie reaction", categoryId: "24" },
    { keyword: "behind the scenes", categoryId: "24" },
    { keyword: "award show moments", categoryId: "24", affinity: ["US", "GB"], heat: 0.8 },
    { keyword: "streaming mystery", categoryId: "24", heat: 0.78 },
    { keyword: "viral challenge", categoryId: "24" },
    { keyword: "talk show clip", categoryId: "24", affinity: ["US", "GB"] }
  ],
  "27": [
    { keyword: "study with me", categoryId: "27" },
    { keyword: "AI study tools", categoryId: "27", affinity: ["US", "IN", "GB"], heat: 0.84 },
    { keyword: "history deep dive", categoryId: "27" },
    { keyword: "language learning", categoryId: "27" },
    { keyword: "exam prep", categoryId: "27", affinity: ["IN", "KR", "JP", "BD"], heat: 0.8 },
    { keyword: "productivity system", categoryId: "27" },
    { keyword: "science explainer", categoryId: "27" }
  ],
  "28": [
    { keyword: "AI agents", categoryId: "28", affinity: ["US", "GB", "IN", "CA", "DE"], heat: 0.97 },
    { keyword: "iPhone", categoryId: "28", affinity: ["US", "GB", "IN", "DE", "JP"], heat: 0.9 },
    { keyword: "home lab", categoryId: "28" },
    { keyword: "EV review", categoryId: "28", affinity: ["NO", "NL", "DE", "US"] },
    { keyword: "space mission", categoryId: "28", affinity: ["US", "JP"], heat: 0.85 },
    { keyword: "open-source model", categoryId: "28", heat: 0.88 },
    { keyword: "gadget teardown", categoryId: "28" },
    { keyword: "future of work", categoryId: "28" },
    { keyword: "coding tutorial", categoryId: "28", affinity: ["IN", "US", "BR"] }
  ],
  "23": [
    { keyword: "stand-up special", categoryId: "23", affinity: ["US", "GB", "AU"] },
    { keyword: "sketch comedy", categoryId: "23" },
    { keyword: "roast battle", categoryId: "23" },
    { keyword: "prank", categoryId: "23" },
    { keyword: "comedy podcast", categoryId: "23", affinity: ["US", "GB"] },
    { keyword: "impressions", categoryId: "23" }
  ],
  "17": [
    { keyword: "Champions League", categoryId: "17", affinity: ["GB", "DE", "FR", "IT", "ES", "BR", "AR"], heat: 0.95 },
    { keyword: "NBA trade", categoryId: "17", affinity: ["US", "CA", "PH"], heat: 0.87 },
    { keyword: "cricket highlights", categoryId: "17", affinity: ["IN", "PK", "AU", "GB", "ZA", "BD", "LK"], heat: 0.94 },
    { keyword: "F1 race", categoryId: "17", affinity: ["GB", "IT", "DE", "NL", "BR", "US", "MX", "ES"], heat: 0.9 },
    { keyword: "tennis final", categoryId: "17", affinity: ["GB", "US", "AU", "FR", "ES"] },
    { keyword: "boxing knockout", categoryId: "17", affinity: ["US", "GB", "MX"] },
    { keyword: "Olympics", categoryId: "17", heat: 0.82 },
    { keyword: "football tactics", categoryId: "17", affinity: ["GB", "DE", "ES", "IT", "FR", "BR"] },
    { keyword: "kabaddi", categoryId: "17", affinity: ["IN", "BD"], heat: 0.66 }
  ],
  "25": [
    { keyword: "election explainer", categoryId: "25", affinity: ["US", "IN", "BR", "GB"], heat: 0.86 },
    { keyword: "market selloff", categoryId: "25", affinity: ["US", "GB", "JP"], heat: 0.83 },
    { keyword: "climate report", categoryId: "25", affinity: ["DE", "SE", "NL", "CA", "AU"] },
    { keyword: "tech regulation", categoryId: "25", affinity: ["US", "GB"] },
    { keyword: "geopolitics", categoryId: "25" },
    { keyword: "breaking news", categoryId: "25" },
    { keyword: "fact check", categoryId: "25" }
  ],
  "26": [
    { keyword: "summer outfit", categoryId: "26", affinity: ["US", "GB", "BR", "AU", "IN"] },
    { keyword: "clean beauty", categoryId: "26" },
    { keyword: "home renovation", categoryId: "26" },
    { keyword: "budget cooking", categoryId: "26", affinity: ["IN", "US", "GB"] },
    { keyword: "DIY furniture", categoryId: "26" },
    { keyword: "capsule wardrobe", categoryId: "26" },
    { keyword: "skincare routine", categoryId: "26", affinity: ["KR", "US", "JP"] }
  ],
  "22": [
    { keyword: "day in my life", categoryId: "22" },
    { keyword: "van life", categoryId: "22" },
    { keyword: "moving abroad", categoryId: "22" },
    { keyword: "silent vlog", categoryId: "22", affinity: ["JP", "KR"] },
    { keyword: "weekly reset", categoryId: "22" },
    { keyword: "life update", categoryId: "22" }
  ],
  "1": [
    { keyword: "anime theory", categoryId: "1", affinity: ["JP", "US", "BR", "FR", "MX"], heat: 0.88 },
    { keyword: "movie trailer", categoryId: "1", affinity: ["US", "GB"], heat: 0.9 },
    { keyword: "animation breakdown", categoryId: "1" },
    { keyword: "short film", categoryId: "1" },
    { keyword: "film analysis", categoryId: "1" },
    { keyword: "VFX reel", categoryId: "1" }
  ],
  "2": [
    { keyword: "EV road trip", categoryId: "2", affinity: ["NO", "NL", "DE", "US"] },
    { keyword: "car restoration", categoryId: "2" },
    { keyword: "hypercar review", categoryId: "2", affinity: ["AE", "US", "GB"], heat: 0.8 },
    { keyword: "driving test", categoryId: "2", affinity: ["GB", "IN"] },
    { keyword: "modding", categoryId: "2", affinity: ["US", "JP"] },
    { keyword: "motorsport build", categoryId: "2", affinity: ["DE", "IT", "US"] }
  ],
  "15": [
    { keyword: "puppy training", categoryId: "15" },
    { keyword: "cat behavior", categoryId: "15", affinity: ["JP", "US"] },
    { keyword: "rescue story", categoryId: "15" },
    { keyword: "aquarium build", categoryId: "15" },
    { keyword: "pet vlog", categoryId: "15" }
  ],
  "19": [
    { keyword: "Tokyo guide", categoryId: "19", affinity: ["US", "GB", "AU", "KR", "TH", "SG"], heat: 0.84 },
    { keyword: "budget travel", categoryId: "19" },
    { keyword: "island hopping", categoryId: "19", affinity: ["PH", "ID", "TH", "GR"] },
    { keyword: "safari", categoryId: "19", affinity: ["ZA", "KE", "TZ"] },
    { keyword: "hidden gems", categoryId: "19" },
    { keyword: "travel vlog", categoryId: "19" },
    { keyword: "festival guide", categoryId: "19", affinity: ["DE", "BR", "US", "GB"] }
  ],
  "29": [
    { keyword: "climate action", categoryId: "29", affinity: ["DE", "SE", "NL", "CA", "AU"] },
    { keyword: "community project", categoryId: "29" },
    { keyword: "animal rescue", categoryId: "29" },
    { keyword: "education access", categoryId: "29", affinity: ["IN", "NG", "KE"] },
    { keyword: "volunteer story", categoryId: "29" }
  ]
};

const CATEGORY_EXTRA_TAGS: Record<string, string[]> = {
  "10": ["new music", "live performance", "music review", "artist interview"],
  "20": ["gameplay", "gaming", "walkthrough", "esports"],
  "24": ["entertainment", "celebrity", "reaction", "behind the scenes"],
  "27": ["education", "learning", "explained", "study tips"],
  "28": ["technology", "review", "science", "innovation"],
  "23": ["comedy", "funny", "sketch", "stand up"],
  "17": ["sports", "highlights", "match recap", "analysis"],
  "25": ["news", "explained", "analysis", "breaking"],
  "26": ["how to", "style", "routine", "diy"],
  "22": ["vlog", "day in the life", "lifestyle", "storytime"],
  "1": ["film", "animation", "movie", "breakdown"],
  "2": ["cars", "review", "automotive", "build"],
  "15": ["pets", "animals", "training", "rescue"],
  "19": ["travel", "guide", "adventure", "vlog"],
  "29": ["nonprofit", "activism", "community", "impact"]
};

const TITLE_TEMPLATES: Record<string, string[]> = {
  "10": [
    "{kw} is taking over the charts",
    "This {kw} performance broke the internet",
    "We listened to 100 {kw} tracks — here are the best",
    "The {kw} wave, explained",
    "24 hours inside the {kw} scene",
    "Why everyone is talking about {kw} right now",
    "{kw} live from {region}",
    "The {kw} track you'll have on repeat"
  ],
  "20": [
    "{kw} but it gets harder every second",
    "I spent 100 hours mastering {kw}",
    "The {kw} update changes everything",
    "{kw} world record attempt",
    "This {kw} play is unreal",
    "Ranking every {kw} meta",
    "The fall of {kw}, explained",
    "{kw} — the run nobody expected"
  ],
  "24": [
    "The {kw} everyone is talking about",
    "Inside the {kw} machine",
    "{kw} — full breakdown",
    "We need to talk about {kw}",
    "The truth behind the {kw} moment",
    "{kw} caught on camera",
    "Why {kw} is everywhere in {year}",
    "{kw}: the internet's new obsession"
  ],
  "27": [
    "{kw}, explained in 8 minutes",
    "The {kw} method that actually works",
    "I tried {kw} for 30 days",
    "{kw}: a beginner's field guide",
    "What school never taught you about {kw}",
    "The hidden history of {kw}",
    "How to build a {kw} habit that sticks",
    "{kw} — the honest study"
  ],
  "28": [
    "{kw} is changing faster than you think",
    "{kw} deep dive: what the benchmarks miss",
    "I tested {kw} for a week",
    "The {kw} era starts now",
    "{kw} explained like you're five",
    "Inside the race for {kw}",
    "The real cost of {kw}",
    "{kw}: hands-on review"
  ],
  "23": [
    "POV: {kw} goes wrong",
    "The {kw} sketch that broke the cast",
    "Trying {kw} until it stops being funny",
    "{kw} is a terrible idea",
    "The {kw} roast nobody expected",
    "Every {kw} conversation, ever",
    "{kw} — live and unhinged"
  ],
  "17": [
    "{kw} highlights that broke the internet",
    "The {kw} moment everyone missed",
    "{kw} tactical breakdown",
    "Inside the {kw} upset",
    "Top 10 {kw} moments of the season",
    "{kw} final — full recap",
    "How {kw} became a global phenomenon",
    "The {kw} call that changed everything"
  ],
  "25": [
    "The {kw} story, explained",
    "What the {kw} headlines got wrong",
    "Inside the {kw} fallout",
    "{kw}: what happens next",
    "The data behind the {kw} panic",
    "A calm breakdown of {kw}",
    "{kw} — what we actually know"
  ],
  "26": [
    "The {kw} routine that changed my life",
    "{kw} on a budget",
    "7 {kw} mistakes you're making",
    "I tried {kw} so you don't have to",
    "{kw} for beginners ({year} edition)",
    "The 10-minute {kw} reset",
    "{kw}: the only guide you need"
  ],
  "22": [
    "A week in my life: {kw}",
    "The honest truth about {kw}",
    "I moved countries for {kw}",
    "{kw} diaries — episode 1",
    "What {kw} actually looks like",
    "My {kw} routine, unfiltered",
    "{kw} — a quiet week"
  ],
  "1": [
    "The {kw} detail you missed",
    "{kw} explained frame by frame",
    "Why {kw} still holds up in {year}",
    "The {kw} theory that changes everything",
    "How {kw} was really made",
    "{kw} — short film",
    "The {kw} scene, decoded"
  ],
  "2": [
    "I took {kw} to the limit",
    "{kw}: the honest review",
    "The {kw} build, start to finish",
    "Why {kw} is dividing enthusiasts",
    "{kw} — first drive",
    "The {kw} test nobody dares to run",
    "{kw}: 1,000 km later"
  ],
  "15": [
    "The {kw} trick that actually works",
    "{kw} — 24 hour challenge",
    "Rescuing a {kw} changed everything",
    "Every {kw} owner knows this feeling",
    "The truth about {kw}",
    "{kw}: from day one"
  ],
  "19": [
    "{kw} on a $50 budget",
    "The complete {kw} guide",
    "{kw}: the places locals avoid",
    "I found the best {kw} spot",
    "The {kw} trip that went sideways",
    "{kw} — cinematic travel diary",
    "48 hours of {kw}"
  ],
  "29": [
    "The {kw} movement you can join",
    "How {kw} is changing one community",
    "{kw}: the numbers behind the mission",
    "A day with the people behind {kw}",
    "Why {kw} matters more than ever",
    "{kw} — the quiet progress"
  ]
};

const CHANNELS: Record<string, string[]> = {
  "10": ["Signal & Sound", "The Frequency", "Earworm FM", "Nightshift Audio", "Open Mike"],
  "20": ["Respawn Room", "Pixel Forge", "The Loadout", "Frame Perfect", "Noclip"],
  "24": ["Backlot", "The Scoop", "Main Character", "Green Room"],
  "27": ["Curious Mind", "The Long Answer", "Study Hall", "First Principles"],
  "28": ["Hardware Letter", "Model Behavior", "The Build Log", "Future Stack"],
  "23": ["Deadpan Studio", "The Setup", "Unserious", "Laugh Track"],
  "17": ["The Touchline", "Full Time", "Courtside", "The Replay"],
  "25": ["The Brief", "Context Desk", "Signal & Noise", "The Ledger"],
  "26": ["Studio Routine", "The Edit", "Slow Style", "Make It Yours"],
  "22": ["Ordinary Days", "The Weekly Reset", "Off Camera", "Northbound"],
  "1": ["Frame by Frame", "The Cutting Room", "Anime Atlas", "Third Act"],
  "2": ["Apex Garage", "The Torque Report", "Daily Driven", "Redline"],
  "15": ["Good Dog Club", "Whisker Notes", "Wild Neighbours", "The Pet Desk"],
  "19": ["Elsewhere", "Roam Notes", "The Layover", "Local First"],
  "29": ["Common Ground", "The Good Work", "Impact Report", "Open Hands"]
};

const REGION_CATEGORY_WEIGHTS: Record<string, Record<string, number>> = {
  US: { "24": 1.4, "10": 1.2, "20": 1.15, "28": 1.25, "23": 1.35, "25": 1.2, "17": 1.2 },
  GB: { "24": 1.35, "23": 1.3, "17": 1.25, "10": 1.2, "25": 1.2 },
  IN: { "10": 1.9, "17": 1.65, "24": 1.4, "23": 1.25, "22": 1.2, "27": 1.2 },
  BR: { "10": 1.5, "17": 1.65, "24": 1.45, "23": 1.2, "22": 1.1 },
  JP: { "10": 1.5, "1": 1.7, "20": 1.45, "24": 1.15, "27": 1.1 },
  DE: { "2": 1.45, "28": 1.3, "27": 1.2, "10": 1.1, "24": 1.1 },
  KR: { "10": 1.8, "20": 1.3, "24": 1.25, "1": 1.2 },
  MX: { "10": 1.5, "17": 1.45, "24": 1.35, "23": 1.1 },
  FR: { "24": 1.3, "1": 1.35, "10": 1.2, "27": 1.1, "23": 1.1 },
  ID: { "10": 1.4, "20": 1.45, "24": 1.25, "23": 1.2 },
  NG: { "10": 1.8, "23": 1.5, "24": 1.2, "22": 1.2 },
  AU: { "17": 1.35, "24": 1.25, "20": 1.15, "23": 1.2 },
  CA: { "24": 1.25, "17": 1.25, "28": 1.15, "23": 1.2 },
  ZA: { "10": 1.4, "17": 1.3, "23": 1.2 },
  PH: { "20": 1.3, "10": 1.3, "24": 1.3, "22": 1.2 },
  TH: { "24": 1.3, "10": 1.2, "20": 1.2 },
  VN: { "10": 1.3, "20": 1.2, "24": 1.2 },
  TR: { "24": 1.3, "10": 1.2, "17": 1.2 },
  AR: { "17": 1.5, "10": 1.4, "24": 1.2 },
  CO: { "10": 1.4, "17": 1.3 },
  CL: { "17": 1.35, "10": 1.2 },
  PE: { "17": 1.3, "10": 1.3 },
  ES: { "17": 1.3, "10": 1.2, "24": 1.2 },
  IT: { "17": 1.3, "10": 1.2, "24": 1.1, "2": 1.2 },
  NL: { "28": 1.25, "2": 1.3, "24": 1.1 },
  SE: { "28": 1.2, "10": 1.2, "27": 1.1 },
  NO: { "2": 1.4, "28": 1.1 },
  PL: { "24": 1.2, "10": 1.15, "20": 1.1 },
  PT: { "17": 1.3, "10": 1.2 },
  AE: { "24": 1.3, "10": 1.2, "2": 1.2 },
  SA: { "24": 1.3, "10": 1.2, "20": 1.1 }
};

const SHORT_BIAS: Record<string, number> = {
  "23": 0.55,
  "24": 0.5,
  "20": 0.48,
  "10": 0.44,
  "17": 0.46,
  "22": 0.5,
  "15": 0.45,
  "26": 0.4,
  "28": 0.35,
  "27": 0.3,
  "25": 0.3,
  "1": 0.35,
  "2": 0.3,
  "19": 0.3,
  "29": 0.3
};

const PREFERRED_HOURS: Record<string, number[]> = {
  "10": [13, 15, 18, 20, 22],
  "20": [16, 18, 20, 22, 23],
  "24": [17, 19, 20, 21, 22],
  "27": [7, 9, 11, 14, 16],
  "28": [8, 10, 12, 15, 17],
  "23": [18, 20, 21, 22],
  "17": [11, 14, 17, 19, 21],
  "25": [6, 8, 10, 12, 17],
  "26": [7, 9, 11, 16, 18],
  "22": [8, 10, 18, 20],
  "1": [15, 17, 20, 22],
  "2": [9, 12, 15, 18],
  "15": [7, 10, 16, 19],
  "19": [8, 10, 13, 17],
  "29": [7, 9, 12, 16, 18]
};

const ALL_TOPICS: TopicSeed[] = Object.values(CATEGORY_TOPICS).flat();

function chooseTrajectory(keyword: string): Trajectory {
  const random = seededRandom(`trajectory:${keyword}`);
  return weightedPick<Trajectory>(["rising", "steady", "spike", "fading"], [0.3, 0.33, 0.18, 0.19], random);
}

function demoId(keyword: string, variant: number): string {
  const raw = hashString(`lens:${keyword}:${variant}`).toString(36).padStart(8, "0");
  const suffix = hashString(`alt:${keyword}`).toString(36).padStart(3, "0");
  return `d${raw.slice(0, 7)}${suffix.slice(0, 3)}`;
}

interface TopicBase {
  seed: TopicSeed;
  popularity: number;
  trajectory: Trajectory;
  primaryRegion: string;
  videos: RawVideo[];
  histories: Record<string, TimePoint[]>;
}

function buildTopicVideos(seed: TopicSeed, dayKey: string, now: number): TopicBase {
  const keyword = seed.keyword;
  const category = CATEGORY_MAP.get(seed.categoryId);
  const popularity = clamp(seed.heat ?? 0.28 + (hashString(`pop:${keyword}`) % 700) / 1000, 0.25, 1);
  const trajectory = chooseTrajectory(keyword);
  const topicRandom = seededRandom(`${dayKey}:topic:${keyword}`);
  const affinity = seed.affinity ?? [];
  const primaryRegion =
    affinity.length > 0
      ? affinity[Math.floor(topicRandom() * affinity.length)]
      : ["US", "GB", "IN", "BR", "JP", "DE", "FR", "MX"][Math.floor(topicRandom() * 8)];

  const variantCount = 1 + (hashString(`variants:${keyword}:${dayKey}`) % 2) + (popularity > 0.9 ? 1 : 0);
  const videos: RawVideo[] = [];
  const histories: Record<string, TimePoint[]> = {};

  for (let variant = 0; variant < variantCount; variant += 1) {
    const random = seededRandom(`${dayKey}:video:${keyword}:${variant}`);
    const id = demoId(keyword, variant);
    const templates = TITLE_TEMPLATES[seed.categoryId] ?? ["{kw} is changing everything"];
    const template = templates[(hashString(`${keyword}:${variant}`) + variant * 3) % templates.length];
    const titleRaw = template
      .replace("{kw}", keyword)
      .replace("{year}", "2026")
      .replace("{region}", regionName(primaryRegion));
    const title =
      titleRaw.startsWith(keyword) && keyword[0] === keyword[0].toLowerCase()
        ? keyword[0].toUpperCase() + titleRaw.slice(1)
        : titleRaw;

    const shortBias = SHORT_BIAS[seed.categoryId] ?? 0.4;
    const format: "short" | "long" = random() < shortBias || variant % 3 === 2 ? "short" : "long";
    const durationSeconds =
      format === "short" ? Math.round(18 + random() * 40) : Math.round(230 + random() * 1_100);

    const ageRanges: Record<Trajectory, [number, number]> = {
      rising: [0.7, 5],
      spike: [1.2, 7],
      steady: [4, 18],
      fading: [13, 30]
    };
    const [minAge, maxAge] = ageRanges[trajectory];
    const baseAgeDays = minAge + random() * (maxAge - minAge);
    const publishDate = new Date(now - baseAgeDays * 86_400_000);
    const preferredHours = PREFERRED_HOURS[seed.categoryId] ?? [9, 13, 17, 20];
    const preferredHour = preferredHours[Math.floor(random() * preferredHours.length)] + (random() < 0.25 ? 1 : 0);
    publishDate.setUTCHours(preferredHour % 24, Math.floor(random() * 60), 0, 0);
    if (publishDate.getTime() > now - 2 * 3_600_000) {
      publishDate.setUTCDate(publishDate.getUTCDate() - 1);
    }
    const publishedAt = publishDate.toISOString();
    const ageDays = Math.max(0.3, (now - publishDate.getTime()) / 86_400_000);

    const trajectoryMultiplier: Record<Trajectory, number> = {
      rising: 1.45,
      spike: 1.15,
      steady: 0.9,
      fading: 0.55
    };
    const organic = 0.62 + random() * 0.85;
    const dailyBase = (12_000 + popularity ** 2 * 1_350_000) * trajectoryMultiplier[trajectory] * organic;
    const variantWeight = variant === 0 ? 1 : 0.38 + random() * 0.72;
    const views = Math.max(3_200, Math.round(dailyBase * Math.pow(Math.max(ageDays, 0.6), 0.93) * variantWeight));

    const likeRate = 0.02 + random() * 0.075 + (seed.categoryId === "10" ? 0.008 : 0);
    const commentRate = 0.0004 + random() * 0.0055;
    const likes = Math.round(views * likeRate);
    const comments = Math.round(views * commentRate);

    const extraTags = CATEGORY_EXTRA_TAGS[seed.categoryId] ?? [];
    const tags = unique([
      keyword,
      ...extraTags.slice(0, 2),
      popularity > 0.82 ? "trending now" : "creator economy",
      "2026",
      category?.name.toLowerCase() ?? "trends"
    ]).slice(0, 8);

    const channels = CHANNELS[seed.categoryId] ?? ["The Signal"];
    const channelTitle = channels[(hashString(`${keyword}:${variant}`) + variant) % channels.length];

    const video: RawVideo = {
      id,
      title,
      description: `A closer look at ${keyword}: the data, the context and the moments driving the conversation in ${regionName(primaryRegion)}.`,
      channelId: `channel-${hashString(`${channelTitle}:${seed.categoryId}`).toString(36)}`,
      channelTitle,
      categoryId: seed.categoryId,
      tags,
      publishedAt,
      durationSeconds,
      views,
      likes,
      comments,
      thumbnail: null,
      language: "en",
      regionCodes: [],
      source: "demo",
      archetype: trajectory
    };

    histories[id] = buildDemoHistory(video, trajectory, now, seededRandom(`${dayKey}:history:${keyword}:${variant}`));
    videos.push(video);
  }

  return { seed, popularity, trajectory, primaryRegion, videos, histories };
}

function buildDemoHistory(
  video: RawVideo,
  trajectory: Trajectory,
  now: number,
  random: () => number
): TimePoint[] {
  const ageDays = Math.max(0.6, (now - new Date(video.publishedAt).getTime()) / 86_400_000);
  const spanDays = Math.min(ageDays, 15);
  const rawPoints = Math.round(spanDays * 2) + 3;
  const pointCount = Math.round(clamp(rawPoints, 6, 24));
  const k =
    trajectory === "rising"
      ? 1.42 + random() * 0.32
      : trajectory === "steady"
        ? 0.95 + random() * 0.2
        : trajectory === "fading"
          ? 0.42 + random() * 0.16
          : 1;

  const points: TimePoint[] = [];
  const noise = 0.97 + random() * 0.06;

  for (let index = 0; index < pointCount; index += 1) {
    const fraction = index / (pointCount - 1);
    const daysAgo = spanDays * (1 - fraction);
    const timeSincePublish = clamp(ageDays - daysAgo, 0.01, ageDays);
    const progress = clamp(timeSincePublish / ageDays, 0.005, 1);

    let cumulative: number;
    if (trajectory === "spike") {
      cumulative = 0.74 * Math.pow(progress, 0.88) + 0.26 * Math.pow(progress, 4.6);
    } else {
      cumulative = Math.pow(progress, k);
    }

    let views = Math.round(video.views * cumulative * (index === pointCount - 1 ? 1 : noise));
    views = Math.max(80, Math.min(views, video.views));
    const likes = index === pointCount - 1 ? video.likes : Math.round(views * (video.likes / Math.max(video.views, 1)));
    const comments =
      index === pointCount - 1 ? video.comments : Math.round(views * (video.comments / Math.max(video.views, 1)));
    const timestamp =
      index === pointCount - 1 ? now : now - daysAgo * 86_400_000 + (random() - 0.5) * 3_600_000;

    points.push({
      t: Math.round(timestamp),
      views,
      likes,
      comments
    });
  }

  points[points.length - 1] = {
    t: now,
    views: video.views,
    likes: video.likes,
    comments: video.comments
  };
  return points;
}

export interface DemoDataset {
  videos: RawVideo[];
  histories: Record<string, TimePoint[]>;
}

/**
 * Builds a deterministic, multi-region synthetic dataset for the current day.
 * A topic is selected into 56 regional "charts"; every variant of the topic
 * carries those region membership flags so cross-region analysis is meaningful.
 */
export function buildDemoDataset(regions: string[], now = Date.now()): DemoDataset {
  const dayKey = new Date(now).toISOString().slice(0, 10);
  const selectedRegions = regions.length ? unique(regions) : ["US"];
  const topics = ALL_TOPICS.map((seed) => buildTopicVideos(seed, dayKey, now));

  const historyMap: Record<string, TimePoint[]> = {};
  for (const topic of topics) {
    Object.assign(historyMap, topic.histories);
  }

  const regionVideos = new Set<string>();

  for (const region of selectedRegions) {
    const weights = REGION_CATEGORY_WEIGHTS[region] ?? {};
    const scored = topics
      .map((topic) => {
        const random = seededRandom(`${dayKey}:${region}:${topic.seed.keyword}`);
        const categoryWeight = weights[topic.seed.categoryId] ?? 1;
        const affinityBoost = topic.seed.affinity?.includes(region) ? 2.9 : 1;
        const dailyRandom = 0.52 + random() * 0.96;
        const score =
          Math.pow(topic.popularity, 1.15) * categoryWeight * affinityBoost * dailyRandom;
        return { topic, score };
      })
      .sort((a, b) => b.score - a.score);

    const chosen = new Set<string>();
    const byCategory = new Map<string, typeof scored>();
    for (const entry of scored) {
      const list = byCategory.get(entry.topic.seed.categoryId) ?? [];
      list.push(entry);
      byCategory.set(entry.topic.seed.categoryId, list);
    }
    for (const entries of byCategory.values()) {
      for (const entry of entries.slice(0, 2)) {
        chosen.add(entry.topic.seed.keyword);
      }
    }
    for (const entry of scored) {
      if (chosen.size >= 56) break;
      chosen.add(entry.topic.seed.keyword);
    }

    for (const topic of topics) {
      if (!chosen.has(topic.seed.keyword)) continue;
      for (const video of topic.videos) {
        if (!video.regionCodes.includes(region)) video.regionCodes.push(region);
        regionVideos.add(video.id);
      }
    }
  }

  const videos = topics
    .flatMap((topic) => topic.videos)
    .filter((video) => regionVideos.has(video.id))
    .map((video) => ({ ...video, regionCodes: [...video.regionCodes] }));

  return { videos, histories: historyMap };
}
