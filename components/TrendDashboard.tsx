"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  Compass,
  Database,
  FileText,
  Globe2,
  LayoutDashboard,
  Lightbulb,
  LineChart,
  Radar,
  RefreshCw,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Tag
} from "lucide-react";
import { DEFAULT_FILTERS, MAX_REGIONS, REGION_MAP } from "@/lib/constants";
import { formatCompact, timeAgo } from "@/lib/format";
import type { AnalysisResult, ApiError, DataMode, Filters, TrendVideo } from "@/lib/types";
import { FilterPanel } from "./FilterPanel";
import { RegionModal } from "./RegionModal";
import { SettingsModal } from "./SettingsModal";
import { Badge, EmptyState } from "./ui";
import { VideoDetail } from "./VideoDetail";
import { ForecastTab } from "./tabs/ForecastTab";
import { MarketsTab } from "./tabs/MarketsTab";
import { OverviewTab } from "./tabs/OverviewTab";
import { PlaybookTab } from "./tabs/PlaybookTab";
import { ReportTab } from "./tabs/ReportTab";
import { TopicsTab } from "./tabs/TopicsTab";

const STORAGE_KEY = "trendlens:config:v1";
const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "markets", label: "Markets", icon: Globe2 },
  { id: "topics", label: "Topics", icon: Tag },
  { id: "forecast", label: "Forecast", icon: LineChart },
  { id: "playbook", label: "Playbook", icon: Lightbulb },
  { id: "report", label: "Report", icon: FileText }
] as const;

type TabId = (typeof TABS)[number]["id"];

interface StoredConfig {
  filters?: Partial<Filters>;
  includeText?: string;
  excludeText?: string;
  apiKey?: string;
}

function splitTerms(value: string): string[] {
  return value
    .split(",")
    .map((term) => term.trim().toLowerCase())
    .filter(Boolean);
}

function requestSignature(filters: Filters, includeText: string, excludeText: string): string {
  return JSON.stringify({
    ...filters,
    includeKeywords: splitTerms(includeText),
    excludeKeywords: splitTerms(excludeText)
  });
}

function loadStoredConfig(): StoredConfig {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoredConfig;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function restoreFilters(stored?: Partial<Filters>): Filters {
  if (!stored) return { ...DEFAULT_FILTERS };
  const regions = Array.isArray(stored.regions)
    ? stored.regions.filter((code) => REGION_MAP.has(code)).slice(0, MAX_REGIONS)
    : [];
  return {
    ...DEFAULT_FILTERS,
    ...stored,
    regions: regions.length ? regions : [...DEFAULT_FILTERS.regions],
    categories: Array.isArray(stored.categories) ? stored.categories.slice(0, 4) : []
  };
}

export default function TrendDashboard() {
  const [filters, setFilters] = useState<Filters>({ ...DEFAULT_FILTERS });
  const [includeText, setIncludeText] = useState("");
  const [excludeText, setExcludeText] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [serverKey, setServerKey] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [running, setRunning] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSignature, setLastSignature] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("overview");
  const [selected, setSelected] = useState<TrendVideo | null>(null);
  const [forecastFocus, setForecastFocus] = useState<string | null>(null);
  const [regionsOpen, setRegionsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const initialized = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const tabNavRef = useRef<HTMLElement | null>(null);

  const execute = useCallback(async (nextFilters: Filters, include: string, exclude: string, key: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(true);
    setError(null);

    const payloadFilters: Filters = {
      ...nextFilters,
      includeKeywords: splitTerms(include),
      excludeKeywords: splitTerms(exclude)
    };
    const signature = JSON.stringify(payloadFilters);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (key.trim()) headers["x-youtube-key"] = key.trim();

      const response = await fetch("/api/trends", {
        method: "POST",
        headers,
        body: JSON.stringify({ filters: payloadFilters }),
        signal: controller.signal
      });
      const payload = (await response.json().catch(() => null)) as AnalysisResult | ApiError | null;

      if (!response.ok || !payload || "error" in payload) {
        const message =
          payload && "error" in payload
            ? payload.error
            : `The scan failed with status ${response.status}. Try again or switch to demo mode.`;
        throw new Error(message);
      }

      setResult(payload);
      setLastSignature(signature);
      setSelected((current) => (current ? payload.videos.find((video) => video.id === current.id) ?? null : null));
    } catch (scanError) {
      if (scanError instanceof DOMException && scanError.name === "AbortError") return;
      setError(scanError instanceof Error ? scanError.message : "Unknown scan error.");
    } finally {
      if (abortRef.current === controller) setRunning(false);
    }
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const stored = loadStoredConfig();
    const restored = restoreFilters(stored.filters);
    const include = typeof stored.includeText === "string" ? stored.includeText : "";
    const exclude = typeof stored.excludeText === "string" ? stored.excludeText : "";
    const key = typeof stored.apiKey === "string" ? stored.apiKey : "";

    setFilters(restored);
    setIncludeText(include);
    setExcludeText(exclude);
    setApiKey(key);
    setHydrated(true);
    void execute(restored, include, exclude, key);

    fetch("/api/trends")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { serverKeyConfigured?: boolean } | null) => {
        if (data?.serverKeyConfigured) setServerKey(true);
      })
      .catch(() => undefined);
  }, [execute]);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ filters, includeText, excludeText, apiKey })
        );
      } catch {
        // Storage can be unavailable in private windows; the app still works.
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [filters, includeText, excludeText, apiKey, hydrated]);

  useEffect(() => {
    const nav = tabNavRef.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !active) return;
    const target = active.offsetLeft - nav.clientWidth / 2 + active.clientWidth / 2;
    nav.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [tab]);

  const signature = requestSignature(filters, includeText, excludeText);
  const dirty = lastSignature !== null && signature !== lastSignature;
  const source = result?.meta.source ?? null;

  function runScan() {
    void execute(filters, includeText, excludeText, apiKey);
  }

  function resetScan() {
    const next = { ...DEFAULT_FILTERS };
    setIncludeText("");
    setExcludeText("");
    setFilters(next);
    setTab("overview");
    void execute(next, "", "", apiKey);
  }

  function applyRegions(codes: string[]) {
    if (!codes.length) return;
    setFilters((current) => ({ ...current, regions: codes.slice(0, MAX_REGIONS) }));
  }

  function saveSettings(nextKey: string, mode: DataMode) {
    setApiKey(nextKey);
    const next = { ...filters, mode };
    setFilters(next);
    void execute(next, includeText, excludeText, nextKey);
  }

  function openForecast(video: TrendVideo) {
    setForecastFocus(video.id);
    setTab("forecast");
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-ink-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-[62px] max-w-[1640px] items-center gap-3 px-3 sm:px-5">
          <button type="button" onClick={() => setTab("overview")} className="flex items-center gap-2.5 text-left">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-lime-400 text-ink-950 shadow-glow">
              <Radar size={19} strokeWidth={2.1} />
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border-2 border-ink-950 bg-mint-400" />
            </span>
            <span>
              <span className="block font-display text-[17px] font-semibold leading-none tracking-tight text-fog-100">
                TrendLens
              </span>
              <span className="mt-1 hidden font-mono text-[7.5px] uppercase tracking-[0.2em] text-fog-600 sm:block">
                Multi-market signal engine
              </span>
            </span>
          </button>

          <div className="mx-1 hidden h-6 w-px bg-white/[0.08] lg:block" />
          <span className="hidden items-center gap-1.5 font-mono text-[8.5px] uppercase tracking-[0.16em] text-fog-500 lg:inline-flex">
            <span className={`h-1.5 w-1.5 rounded-full ${running ? "animate-pulseSoft bg-amber-400" : "bg-mint-400"}`} />
            {running ? "Scanning markets" : result ? `Scan complete · ${timeAgo(result.meta.generatedAt)}` : "Engine ready"}
          </span>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="hidden items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.025] px-2.5 py-1.5 text-left transition-colors hover:border-white/[0.16] hover:bg-white/[0.045] sm:flex"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${source === "live" ? "bg-sky-400" : source === "demo" ? "bg-[#9b8cff]" : "bg-fog-600"}`} />
              <span>
                <span className="block font-mono text-[8px] uppercase tracking-[0.13em] text-fog-600">Data source</span>
                <span className="block text-[10px] font-medium text-fog-200">
                  {source === "live" ? "Live YouTube" : source === "demo" ? "Demo dataset" : "Not scanned"}
                </span>
              </span>
              <Settings2 size={11} className="text-fog-500" />
            </button>
            <button type="button" onClick={() => setSettingsOpen(true)} className="btn-icon !h-8 !w-8 sm:hidden" aria-label="Data source settings">
              <Database size={14} />
            </button>
            <button
              type="button"
              onClick={runScan}
              disabled={running}
              className="btn-secondary !px-2.5 !py-1.5 !text-[11px] sm:!px-3"
              title="Refresh signal scan"
            >
              <RefreshCw size={13} className={running ? "animate-spin" : ""} />
              <span className="hidden sm:inline">{running ? "Scanning…" : "Refresh scan"}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1640px] px-3 pb-14 sm:px-5">
        <section className="flex flex-col justify-between gap-5 pb-5 pt-6 md:flex-row md:items-end lg:pt-8">
          <div className="max-w-3xl">
            <div className="mb-3 flex flex-wrap items-center gap-2 font-mono text-[8.5px] uppercase tracking-[0.2em] text-fog-500">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-lime-400 shadow-[0_0_10px_rgba(198,255,74,0.7)]" />
              Multi-market YouTube intelligence
              <span className="text-fog-600">/</span>
              <span className="text-fog-400">Signal Engine 1.3</span>
            </div>
            <h1 className="font-display text-[32px] font-semibold leading-[1.05] tracking-[-0.035em] text-fog-100 sm:text-[42px] lg:text-[46px]">
              See the curve <span className="text-lime-300">before it breaks.</span>
            </h1>
            <p className="mt-3 max-w-xl text-[12.5px] leading-relaxed text-fog-400 sm:text-[13px]">
              Scan up to 12 YouTube markets at once, tune the precision gate, and turn emerging momentum into
              cross-market forecasts and shoot-ready content ideas.
            </p>
          </div>

          <div className="grid shrink-0 grid-cols-3 gap-5 pb-1 md:border-l md:border-white/[0.08] md:pl-6">
            <HeroStat
              label="Markets"
              value={String(filters.regions.length)}
              sub={filters.regions.slice(0, 2).join(" · ") + (filters.regions.length > 2 ? " +" : "")}
            />
            <HeroStat
              label="Signals"
              value={result ? String(result.videos.length) : running ? "…" : "—"}
              sub={result ? `${result.meta.filtered} candidates` : "awaiting scan"}
            />
            <HeroStat
              label="Gate"
              value={`${filters.precision}`}
              sub={dirty ? "filters changed" : "precision"}
              accent={dirty}
            />
          </div>
        </section>

        <button
          type="button"
          onClick={() => setMobileFiltersOpen((open) => !open)}
          className="btn-secondary mb-3 w-full lg:hidden"
        >
          <SlidersHorizontal size={14} />
          {mobileFiltersOpen ? "Hide analysis desk" : "Open analysis desk"}
          <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.1em] text-fog-500">
            {filters.regions.length} markets · P{filters.precision}
          </span>
        </button>

        <div className="grid gap-4 lg:grid-cols-[290px,minmax(0,1fr)] xl:grid-cols-[304px,minmax(0,1fr)]">
          <div className={`${mobileFiltersOpen ? "block" : "hidden"} lg:block`}>
            <FilterPanel
              filters={filters}
              includeText={includeText}
              excludeText={excludeText}
              onFiltersChange={setFilters}
              onIncludeTextChange={setIncludeText}
              onExcludeTextChange={setExcludeText}
              onOpenRegions={() => setRegionsOpen(true)}
              onOpenSettings={() => setSettingsOpen(true)}
              onRun={runScan}
              onReset={resetScan}
              running={running}
              dirty={dirty}
            />
          </div>

          <div className="min-w-0 space-y-3">
            <div className="panel overflow-hidden">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-white/[0.06] px-3 py-2.5 sm:px-4">
                <span className="inline-flex items-center gap-1.5 font-mono text-[8.5px] uppercase tracking-[0.13em] text-fog-400">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      running ? "animate-pulseSoft bg-amber-400" : error ? "bg-coral-400" : "bg-mint-400"
                    }`}
                  />
                  {running ? "Scanning selected markets" : error ? "Scan failed" : "Signal desk"}
                </span>
                {result ? (
                  <>
                    <span className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-fog-600">
                      {result.meta.matched} signals / {result.meta.filtered} candidates
                    </span>
                    <span className="hidden font-mono text-[8.5px] uppercase tracking-[0.12em] text-fog-600 sm:inline">
                      {result.meta.gateThreshold}% cut by precision gate
                    </span>
                    <span className="hidden font-mono text-[8.5px] uppercase tracking-[0.12em] text-fog-600 md:inline">
                      {formatCompact(result.insights.summary.totalViews)} cumulative views
                    </span>
                  </>
                ) : null}
                <div className="ml-auto flex items-center gap-2">
                  {result ? (
                    <Badge variant={source === "live" ? "sky" : "violet"} dot>
                      {source === "live" ? (result.meta.cached ? "Live · cached" : "Live charts") : "Demo dataset"}
                    </Badge>
                  ) : null}
                  <span className="hidden font-mono text-[8.5px] uppercase tracking-[0.1em] text-fog-600 xl:inline">
                    {running ? "Scanning" : result ? `${result.meta.durationMs}ms` : "Ready"}
                  </span>
                </div>
              </div>
              <nav
                ref={tabNavRef}
                className="tab-scroll flex items-center gap-1 overflow-x-auto px-2 py-1.5"
                aria-label="Dashboard sections"
              >
                {TABS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTab(item.id)}
                      className={`tab-button !py-1.5 ${tab === item.id ? "tab-active" : ""}`}
                      aria-current={tab === item.id ? "page" : undefined}
                    >
                      <Icon size={13} />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {result?.meta.warning ? (
              <div className="callout callout-warn">
                <ShieldCheck size={15} className="mt-0.5 shrink-0" />
                <p>{result.meta.warning}</p>
              </div>
            ) : null}
            {result?.meta.note ? (
              <div className="callout callout-info">
                <Compass size={15} className="mt-0.5 shrink-0" />
                <p>{result.meta.note}</p>
              </div>
            ) : null}
            {error ? (
              <div className="callout callout-warn">
                <BarChart3 size={15} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">The scan could not complete.</p>
                  <p className="mt-0.5 text-[11.5px] opacity-80">{error}</p>
                  <div className="mt-2 flex gap-2">
                    <button type="button" onClick={runScan} className="btn-secondary !px-2.5 !py-1 !text-[10.5px]">
                      Try again
                    </button>
                    <button type="button" onClick={() => setSettingsOpen(true)} className="btn-ghost !px-2.5 !py-1 !text-[10.5px]">
                      Check data source
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {!result && running ? (
              <ScanSkeleton />
            ) : !result && error ? (
              <EmptyState
                icon={<Radar size={19} />}
                title="No scan data yet"
                description="Adjust the data source or try the scan again. Demo mode works without an API key."
                action={
                  <button type="button" onClick={() => setSettingsOpen(true)} className="btn-primary">
                    <Settings2 size={14} />
                    Open data sources
                  </button>
                }
              />
            ) : result && result.videos.length === 0 ? (
              <EmptyState
                icon={<Radar size={19} />}
                title="No signals survived the current filters"
                description="The scan reached candidates, but the precision gate returned nothing. Lower precision, raise max age, or widen markets and categories."
                action={
                  <button type="button" onClick={resetScan} className="btn-primary">
                    <RefreshCw size={14} />
                    Reset and rescan
                  </button>
                }
              />
            ) : result ? (
              <div key={tab} className="animate-fadeUp">
                {tab === "overview" ? (
                  <OverviewTab
                    result={result}
                    onSelect={setSelected}
                    onTab={setTab}
                    onForecast={openForecast}
                  />
                ) : null}
                {tab === "markets" ? <MarketsTab result={result} onSelect={setSelected} /> : null}
                {tab === "topics" ? <TopicsTab result={result} onSelect={setSelected} /> : null}
                {tab === "forecast" ? (
                  <ForecastTab result={result} onSelect={setSelected} initialVideoId={forecastFocus} />
                ) : null}
                {tab === "playbook" ? <PlaybookTab result={result} /> : null}
                {tab === "report" ? <ReportTab result={result} onSelect={setSelected} /> : null}
              </div>
            ) : null}

            {result ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 pt-1">
                <span className="inline-flex items-center gap-1.5 font-mono text-[8.5px] uppercase tracking-[0.1em] text-fog-600">
                  <span className={`h-1 w-1 rounded-full ${source === "live" ? "bg-sky-400" : "bg-[#9b8cff]"}`} />
                  {source === "live" ? "Live YouTube most-popular charts" : "Deterministic synthetic dataset"}
                </span>
                <span className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-fog-600">
                  Generated {timeAgo(result.meta.generatedAt)}
                </span>
                <button
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  className="ml-auto inline-flex items-center gap-1 font-mono text-[8.5px] uppercase tracking-[0.1em] text-fog-500 transition-colors hover:text-lime-300"
                >
                  Change data source
                  <ArrowUpRight size={9} />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </main>

      <footer className="border-t border-white/[0.06] bg-ink-950/50">
        <div className="mx-auto flex max-w-[1640px] flex-col gap-2 px-3 py-5 text-[10px] text-fog-600 sm:flex-row sm:items-center sm:px-5">
          <div className="flex items-center gap-2">
            <Radar size={12} className="text-fog-500" />
            <span className="font-mono uppercase tracking-[0.14em] text-fog-500">TrendLens</span>
            <span>·</span>
            <span>Signal Engine 1.3</span>
          </div>
          <p className="sm:ml-auto">
            Demo signals are synthetic and labelled. Forecasting is directional, not a guarantee of performance.
          </p>
        </div>
      </footer>

      <RegionModal
        open={regionsOpen}
        onClose={() => setRegionsOpen(false)}
        selected={filters.regions}
        onApply={applyRegions}
      />
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        apiKey={apiKey}
        mode={filters.mode}
        serverKey={serverKey}
        onSave={saveSettings}
      />
      {selected && result ? (
        <VideoDetail video={selected} meta={result.meta} onClose={() => setSelected(null)} />
      ) : null}
    </div>
  );
}

function HeroStat({
  label,
  value,
  sub,
  accent = false
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div className="min-w-[72px]">
      <div className="font-mono text-[8px] uppercase tracking-[0.16em] text-fog-600">{label}</div>
      <div className={`mt-1 font-display text-[22px] font-semibold leading-none tabular ${accent ? "text-amber-400" : "text-fog-100"}`}>
        {value}
      </div>
      <div className="mt-1 max-w-[110px] truncate font-mono text-[8px] uppercase tracking-[0.08em] text-fog-600">
        {sub}
      </div>
    </div>
  );
}

function ScanSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Scanning markets">
      <div className="panel relative overflow-hidden p-5">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 animate-scan bg-gradient-to-b from-lime-400/[0.07] to-transparent" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-lime-400/20 bg-lime-400/[0.08] text-lime-300">
            <Radar size={18} className="animate-spin [animation-duration:4s]" />
          </span>
          <div>
            <h2 className="font-display text-base font-semibold text-fog-100">Scanning regional charts</h2>
            <p className="mt-1 text-[11.5px] text-fog-400">
              Fetching candidates, scoring momentum and calibrating the forecast model…
            </p>
          </div>
          <span className="ml-auto hidden font-mono text-[8.5px] uppercase tracking-[0.14em] text-fog-600 sm:block">
            Precision gate armed
          </span>
        </div>
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full w-1/3 animate-shimmer rounded-full bg-gradient-to-r from-lime-400/20 via-lime-400 to-lime-400/20 bg-[length:200%_100%]" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="panel h-[94px] p-3.5">
            <div className="skeleton h-2 w-2/3" />
            <div className="skeleton mt-4 h-6 w-1/3" />
            <div className="skeleton mt-3 h-2 w-full" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.55fr,1fr]">
        <div className="panel h-[380px] p-4">
          <div className="skeleton h-3 w-1/3" />
          <div className="skeleton mt-6 h-[290px] w-full" />
        </div>
        <div className="panel h-[380px] p-4">
          <div className="skeleton h-3 w-1/2" />
          <div className="skeleton mt-6 h-3 w-full" />
          <div className="skeleton mt-3 h-3 w-4/5" />
          <div className="skeleton mt-3 h-3 w-11/12" />
          <div className="skeleton mt-3 h-3 w-2/3" />
        </div>
      </div>
    </div>
  );
}
