import type { Filters } from "./types";

export interface Region {
  code: string;
  name: string;
  flag: string;
}

function flagOf(code: string): string {
  if (code === "EU") return "🇪🇺";
  return String.fromCodePoint(
    ...code
      .toUpperCase()
      .split("")
      .map((char) => 127397 + char.charCodeAt(0))
  );
}

const REGION_ROWS: Array<[string, string]> = [
  ["DZ", "Algeria"],
  ["AR", "Argentina"],
  ["AM", "Armenia"],
  ["AU", "Australia"],
  ["AT", "Austria"],
  ["AZ", "Azerbaijan"],
  ["BH", "Bahrain"],
  ["BD", "Bangladesh"],
  ["BY", "Belarus"],
  ["BE", "Belgium"],
  ["BO", "Bolivia"],
  ["BA", "Bosnia and Herzegovina"],
  ["BR", "Brazil"],
  ["BG", "Bulgaria"],
  ["KH", "Cambodia"],
  ["CA", "Canada"],
  ["CL", "Chile"],
  ["CO", "Colombia"],
  ["CR", "Costa Rica"],
  ["HR", "Croatia"],
  ["CY", "Cyprus"],
  ["CZ", "Czechia"],
  ["DK", "Denmark"],
  ["DO", "Dominican Republic"],
  ["EC", "Ecuador"],
  ["EG", "Egypt"],
  ["SV", "El Salvador"],
  ["EE", "Estonia"],
  ["FI", "Finland"],
  ["FR", "France"],
  ["GE", "Georgia"],
  ["DE", "Germany"],
  ["GH", "Ghana"],
  ["GR", "Greece"],
  ["GT", "Guatemala"],
  ["HN", "Honduras"],
  ["HK", "Hong Kong"],
  ["HU", "Hungary"],
  ["IS", "Iceland"],
  ["IN", "India"],
  ["ID", "Indonesia"],
  ["IQ", "Iraq"],
  ["IE", "Ireland"],
  ["IL", "Israel"],
  ["IT", "Italy"],
  ["JM", "Jamaica"],
  ["JP", "Japan"],
  ["JO", "Jordan"],
  ["KZ", "Kazakhstan"],
  ["KE", "Kenya"],
  ["KW", "Kuwait"],
  ["LA", "Laos"],
  ["LV", "Latvia"],
  ["LB", "Lebanon"],
  ["LY", "Libya"],
  ["LI", "Liechtenstein"],
  ["LT", "Lithuania"],
  ["LU", "Luxembourg"],
  ["MY", "Malaysia"],
  ["MT", "Malta"],
  ["MX", "Mexico"],
  ["MD", "Moldova"],
  ["ME", "Montenegro"],
  ["MA", "Morocco"],
  ["NP", "Nepal"],
  ["NL", "Netherlands"],
  ["NZ", "New Zealand"],
  ["NI", "Nicaragua"],
  ["NG", "Nigeria"],
  ["MK", "North Macedonia"],
  ["NO", "Norway"],
  ["OM", "Oman"],
  ["PK", "Pakistan"],
  ["PA", "Panama"],
  ["PG", "Papua New Guinea"],
  ["PY", "Paraguay"],
  ["PE", "Peru"],
  ["PH", "Philippines"],
  ["PL", "Poland"],
  ["PT", "Portugal"],
  ["PR", "Puerto Rico"],
  ["QA", "Qatar"],
  ["RO", "Romania"],
  ["RU", "Russia"],
  ["SA", "Saudi Arabia"],
  ["SN", "Senegal"],
  ["RS", "Serbia"],
  ["SG", "Singapore"],
  ["SK", "Slovakia"],
  ["SI", "Slovenia"],
  ["ZA", "South Africa"],
  ["KR", "South Korea"],
  ["ES", "Spain"],
  ["LK", "Sri Lanka"],
  ["SE", "Sweden"],
  ["CH", "Switzerland"],
  ["TW", "Taiwan"],
  ["TZ", "Tanzania"],
  ["TH", "Thailand"],
  ["TN", "Tunisia"],
  ["TR", "Turkey"],
  ["UG", "Uganda"],
  ["UA", "Ukraine"],
  ["AE", "United Arab Emirates"],
  ["GB", "United Kingdom"],
  ["US", "United States"],
  ["UY", "Uruguay"],
  ["VE", "Venezuela"],
  ["VN", "Vietnam"],
  ["YE", "Yemen"],
  ["ZW", "Zimbabwe"]
];

export const REGIONS: Region[] = REGION_ROWS.map(([code, name]) => ({
  code,
  name,
  flag: flagOf(code)
}));

export const REGION_MAP = new Map(REGIONS.map((region) => [region.code, region]));

export function regionName(code: string): string {
  return REGION_MAP.get(code)?.name ?? code;
}

export function regionFlag(code: string): string {
  return REGION_MAP.get(code)?.flag ?? "🌐";
}

export const REGION_PACKS: Array<{ name: string; description: string; codes: string[] }> = [
  {
    name: "Global pulse",
    description: "The six biggest English + creator markets",
    codes: ["US", "GB", "CA", "AU", "DE", "IN"]
  },
  {
    name: "English core",
    description: "English-speaking charts",
    codes: ["US", "GB", "CA", "AU", "NZ", "IE", "SG", "ZA"]
  },
  {
    name: "Europe",
    description: "Western & Northern Europe",
    codes: ["DE", "FR", "IT", "ES", "NL", "SE", "PL", "PT"]
  },
  {
    name: "Asia Pacific",
    description: "High-velocity APAC markets",
    codes: ["JP", "KR", "IN", "ID", "TH", "VN", "PH", "SG"]
  },
  {
    name: "LATAM",
    description: "Latin American charts",
    codes: ["BR", "MX", "AR", "CO", "CL", "PE"]
  },
  {
    name: "Middle East",
    description: "MENA charts",
    codes: ["AE", "SA", "QA", "KW", "BH", "OM"]
  }
];

export interface Category {
  id: string;
  name: string;
  short: string;
  color: string;
  icon: string;
}

export const CATEGORIES: Category[] = [
  { id: "10", name: "Music", short: "Music", color: "#c6ff4a", icon: "music" },
  { id: "20", name: "Gaming", short: "Gaming", color: "#9b8cff", icon: "gamepad" },
  { id: "24", name: "Entertainment", short: "Entertainment", color: "#ff7c6b", icon: "sparkles" },
  { id: "27", name: "Education", short: "Education", color: "#4ae3c6", icon: "graduation" },
  { id: "28", name: "Science & Technology", short: "Sci & Tech", color: "#5b8cff", icon: "cpu" },
  { id: "23", name: "Comedy", short: "Comedy", color: "#ffbd5c", icon: "laugh" },
  { id: "17", name: "Sports", short: "Sports", color: "#34d399", icon: "trophy" },
  { id: "25", name: "News & Politics", short: "News", color: "#f472b6", icon: "newspaper" },
  { id: "26", name: "How-to & Style", short: "How-to", color: "#f59e0b", icon: "wand" },
  { id: "22", name: "People & Blogs", short: "People", color: "#a3b8cc", icon: "user" },
  { id: "1", name: "Film & Animation", short: "Film", color: "#e879f9", icon: "clapper" },
  { id: "2", name: "Autos & Vehicles", short: "Autos", color: "#fb7185", icon: "car" },
  { id: "15", name: "Pets & Animals", short: "Pets", color: "#fbbf24", icon: "paw" },
  { id: "19", name: "Travel & Events", short: "Travel", color: "#38bdf8", icon: "plane" },
  { id: "29", name: "Nonprofits & Activism", short: "Nonprofit", color: "#84cc16", icon: "heart" }
];

export const CATEGORY_MAP = new Map(CATEGORIES.map((category) => [category.id, category]));

export function categoryName(id: string): string {
  return CATEGORY_MAP.get(id)?.name ?? "General";
}

export const DEFAULT_FILTERS: Filters = {
  regions: ["US", "GB", "IN", "BR", "JP", "DE"],
  categories: [],
  precision: 55,
  includeKeywords: [],
  excludeKeywords: [],
  minViews: 10_000,
  maxAgeDays: 30,
  duration: "any",
  limit: 24,
  mode: "auto"
};

export const MAX_REGIONS = 12;
export const MAX_CATEGORIES = 4;

export const PRECISION_BANDS = [
  {
    min: 0,
    label: "Exploratory",
    blurb: "Wide net. Surfaces emerging and adjacent signals with lower confidence."
  },
  {
    min: 35,
    label: "Balanced",
    blurb: "Default blend of reach, velocity, engagement and freshness."
  },
  {
    min: 65,
    label: "Strict",
    blurb: "Filters out average performers. Favours acceleration and engagement."
  },
  {
    min: 85,
    label: "Surgical",
    blurb: "Only the most differentiated signals survive the precision gate."
  }
];

export function precisionBand(precision: number) {
  const band = [...PRECISION_BANDS].reverse().find((item) => precision >= item.min) ?? PRECISION_BANDS[0];
  return { ...band, value: Math.round(precision) };
}

export const STOPWORDS = new Set(
  [
    "a", "about", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't", "as", "at",
    "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can", "can't",
    "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during",
    "each", "few", "for", "from", "further", "get", "got", "had", "hadn't", "has", "hasn't", "have", "haven't",
    "having", "he", "he'd", "he'll", "he's", "her", "here", "here's", "hers", "herself", "him", "himself", "his",
    "how", "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's", "its",
    "itself", "let's", "me", "more", "most", "mustn't", "my", "myself", "no", "nor", "not", "of", "off", "on",
    "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "shan't",
    "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such", "than", "that", "that's",
    "the", "their", "theirs", "them", "themselves", "then", "there", "there's", "these", "they", "they'd",
    "they'll", "they're", "they've", "this", "those", "through", "to", "too", "under", "until", "up", "very",
    "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were", "weren't", "what", "what's", "when",
    "when's", "where", "where's", "which", "while", "who", "who's", "whom", "why", "why's", "with", "won't",
    "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours", "yourself", "yourselves",
    "official", "video", "full", "new", "best", "top", "vs", "ft", "feat", "ep", "part", "live", "watch", "day",
    "days", "week", "year", "2024", "2025", "2026", "2027", "trending", "viral", "shorts", "short", "youtube",
    "explained", "everything", "nobody", "actually", "really", "world", "world's", "people", "thing", "things"
  ].map((word) => word.toLowerCase())
);
