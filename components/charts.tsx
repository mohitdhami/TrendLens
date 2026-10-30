"use client";

import { useId } from "react";
import { CATEGORY_MAP, REGION_MAP } from "@/lib/constants";
import { formatCompact, formatDayDate, formatPercent, scoreBand } from "@/lib/format";
import type { HeatmapCell, TimingCell, TrendVideo } from "@/lib/types";

export function Sparkline({
  values,
  width = 104,
  height = 30,
  color = "#c6ff4a",
  filled = true,
  className = ""
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  filled?: boolean;
  className?: string;
}) {
  const gradientId = useId().replace(/[:]/g, "");
  const series = values.length >= 2 ? values : [0, 0];
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const padding = 2;
  const usable = height - padding * 2;
  const points = series.map((value, index) => {
    const x = (index / (series.length - 1)) * width;
    const y = padding + (1 - (value - min) / span) * usable;
    return [x, y] as const;
  });
  const line = points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={className}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {filled ? (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.26" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${gradientId})`} />
        </>
      ) : null}
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.length ? (
        <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r="2" fill={color} />
      ) : null}
    </svg>
  );
}

export function ScoreRing({
  score,
  size = 78,
  stroke = 5,
  sublabel = "SIGNAL",
  className = ""
}: {
  score: number;
  size?: number;
  stroke?: number;
  sublabel?: string;
  className?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (Math.max(0, Math.min(100, score)) / 100) * circumference;
  const band = scoreBand(score);
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={band.hex}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-display text-base font-semibold leading-none tabular ${band.text}`}>
          {score.toFixed(1)}
        </span>
        <span className="mt-0.5 font-mono text-[7px] uppercase tracking-[0.18em] text-fog-500">{sublabel}</span>
      </div>
    </div>
  );
}

export function CategoryDonut({
  slices,
  size = 144,
  thickness = 16,
  centerLabel,
  centerValue
}: {
  slices: Array<{ label: string; value: number; color: string }>;
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.055)" strokeWidth={thickness} />
        {slices.map((slice) => {
          const length = (slice.value / total) * circumference;
          const circle = (
            <circle
              key={slice.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={slice.color}
              strokeWidth={thickness}
              strokeDasharray={`${Math.max(length - 2, 0)} ${circumference}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          );
          offset += length;
          return circle;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-xl font-semibold leading-none text-fog-100">{centerValue}</span>
        <span className="mt-1 font-mono text-[8px] uppercase tracking-[0.16em] text-fog-500">{centerLabel}</span>
      </div>
    </div>
  );
}

export function MomentumMap({
  videos,
  onSelect
}: {
  videos: TrendVideo[];
  onSelect?: (video: TrendVideo) => void;
}) {
  const width = 720;
  const height = 330;
  const padding = { left: 48, right: 18, top: 20, bottom: 38 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;
  const xMax = Math.max(20, Math.ceil(Math.max(...videos.map((video) => video.momentum * 100), 10) / 10) * 10);
  const yMax = Math.max(5, Math.ceil(Math.max(...videos.map((video) => video.engagementRate), 1)));
  const x = (value: number) => padding.left + (Math.min(value, xMax) / xMax) * plotW;
  const y = (value: number) => padding.top + plotH - (Math.min(value, yMax) / yMax) * plotH;
  const medianIndex = Math.floor(videos.length / 2);
  const medianX = videos.length
    ? [...videos].sort((a, b) => a.momentum - b.momentum)[medianIndex].momentum * 100
    : 0;
  const medianY = videos.length
    ? [...videos].sort((a, b) => a.engagementRate - b.engagementRate)[medianIndex].engagementRate
    : 0;
  const categories = [...new Set(videos.map((video) => video.categoryId))].slice(0, 6);

  return (
    <div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[620px] w-full" role="img" aria-label="Momentum versus engagement scatter plot">
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
            <g key={`y-${tick}`}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={padding.top + plotH * tick}
                y2={padding.top + plotH * tick}
                stroke="rgba(255,255,255,0.055)"
                strokeWidth="1"
              />
              <text
                x={padding.left - 8}
                y={padding.top + plotH * tick + 3}
                textAnchor="end"
                fill="#647586"
                fontSize="8.5"
                fontFamily="JetBrains Mono, monospace"
              >
                {(yMax * (1 - tick)).toFixed(1)}%
              </text>
            </g>
          ))}
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
            <g key={`x-${tick}`}>
              <line
                x1={padding.left + plotW * tick}
                x2={padding.left + plotW * tick}
                y1={padding.top}
                y2={padding.top + plotH}
                stroke="rgba(255,255,255,0.045)"
                strokeWidth="1"
              />
              <text
                x={padding.left + plotW * tick}
                y={height - 14}
                textAnchor="middle"
                fill="#647586"
                fontSize="8.5"
                fontFamily="JetBrains Mono, monospace"
              >
                {Math.round(xMax * tick)}%
              </text>
            </g>
          ))}
          <line
            x1={x(medianX)}
            x2={x(medianX)}
            y1={padding.top}
            y2={padding.top + plotH}
            stroke="rgba(198,255,74,0.18)"
            strokeDasharray="3 5"
          />
          <line
            x1={padding.left}
            x2={width - padding.right}
            y1={y(medianY)}
            y2={y(medianY)}
            stroke="rgba(198,255,74,0.18)"
            strokeDasharray="3 5"
          />
          <text x={x(medianX) + 6} y={padding.top + 12} fill="#8495a5" fontSize="8" fontFamily="JetBrains Mono, monospace">
            MEDIAN MOMENTUM
          </text>
          <text x={padding.left + 6} y={y(medianY) - 6} fill="#8495a5" fontSize="8" fontFamily="JetBrains Mono, monospace">
            MEDIAN ENGAGEMENT
          </text>
          {videos.map((video) => {
            const category = CATEGORY_MAP.get(video.categoryId);
            const color = category?.color ?? "#8495a5";
            const radius = 3.5 + (video.trendScore / 100) * 7;
            return (
              <g
                key={video.id}
                className={onSelect ? "cursor-pointer" : ""}
                onClick={() => onSelect?.(video)}
                role={onSelect ? "button" : undefined}
              >
                <title>
                  {`${video.title}\nTrend score ${video.trendScore} · ${formatPercent(video.momentum * 100, true)}/day\nEngagement ${formatPercent(video.engagementRate)} · ${formatCompact(video.views)} views`}
                </title>
                <circle cx={x(video.momentum * 100)} cy={y(video.engagementRate)} r={radius} fill={color} fillOpacity="0.16" stroke={color} strokeOpacity="0.7" strokeWidth="1.2" />
                <circle cx={x(video.momentum * 100)} cy={y(video.engagementRate)} r={Math.max(1.2, radius * 0.25)} fill={color} />
              </g>
            );
          })}
          <text x={padding.left} y={padding.top - 6} fill="#475665" fontSize="8" fontFamily="JetBrains Mono, monospace">
            ENGAGEMENT RATE →
          </text>
          <text x={width - padding.right} y={height - 1} textAnchor="end" fill="#475665" fontSize="8" fontFamily="JetBrains Mono, monospace">
            MOMENTUM / DAY →
          </text>
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        {categories.map((categoryId) => {
          const category = CATEGORY_MAP.get(categoryId);
          return (
            <span key={categoryId} className="inline-flex items-center gap-1.5 text-[10.5px] text-fog-400">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: category?.color ?? "#8495a5" }} />
              {category?.short ?? "Other"}
            </span>
          );
        })}
        <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.12em] text-fog-600">
          Bubble size = signal score
        </span>
      </div>
    </div>
  );
}

export function ForecastChart({
  video,
  horizon = 7,
  height = 240
}: {
  video: TrendVideo;
  horizon?: number;
  height?: number;
}) {
  const gradientId = useId().replace(/[:]/g, "");
  const forecast = video.forecasts.find((item) => item.horizonDays === horizon);
  const width = 720;
  const padding = { left: 46, right: 18, top: 18, bottom: 34 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;
  const now = Date.now();
  const endTime = now + horizon * 86_400_000;
  const history = [...video.history].sort((a, b) => a.t - b.t);
  const startTime = history[0]?.t ?? now - 7 * 86_400_000;
  const allValues = [
    ...history.map((point) => point.views),
    forecast?.low ?? video.views,
    forecast?.high ?? video.views,
    video.views
  ];
  const minValue = Math.max(100, Math.min(...allValues) * 0.82);
  const maxValue = Math.max(...allValues) * 1.18;
  const logMin = Math.log10(minValue);
  const logMax = Math.log10(maxValue);
  const span = Math.max(0.001, logMax - logMin);
  const x = (time: number) => padding.left + ((time - startTime) / Math.max(1, endTime - startTime)) * plotW;
  const y = (views: number) =>
    padding.top + plotH - ((Math.log10(Math.max(views, 100)) - logMin) / span) * plotH;

  const historyPoints = history.map((point) => [x(point.t), y(point.views)] as const);
  const historyPath = historyPoints
    .map(([px, py], index) => `${index === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`)
    .join(" ");
  const areaPath = `${historyPath} L${x(history[history.length - 1]?.t ?? now)},${padding.top + plotH} L${x(startTime)},${padding.top + plotH} Z`;

  const currentX = x(now);
  const currentY = y(video.views);
  const endX = x(endTime);
  const lowY = y(forecast?.low ?? video.views);
  const highY = y(forecast?.high ?? video.views);
  const predictedY = y(forecast?.predictedViews ?? video.views);
  const color = scoreBand(video.trendScore).hex;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
        <div className="flex items-center gap-3 text-[10.5px] text-fog-400">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-[2px] w-4 rounded bg-fog-300" /> Observed
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-[2px] w-4 rounded border-t border-dashed border-lime-400" /> Forecast
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-sm bg-lime-400/20" /> 80% interval
          </span>
        </div>
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-fog-500">
          {horizon}-day horizon
        </span>
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[560px] w-full" role="img" aria-label="Observed views and forecast interval">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.18" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
            const value = 10 ** (logMax - span * tick);
            return (
              <g key={tick}>
                <line
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={padding.top + plotH * tick}
                  y2={padding.top + plotH * tick}
                  stroke="rgba(255,255,255,0.055)"
                />
                <text
                  x={padding.left - 8}
                  y={padding.top + plotH * tick + 3}
                  textAnchor="end"
                  fill="#647586"
                  fontSize="8"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {formatCompact(value)}
                </text>
              </g>
            );
          })}
          <path d={areaPath} fill={`url(#${gradientId})`} />
          <path d={historyPath} fill="none" stroke="#c3d3e1" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
          {forecast ? (
            <>
              <path
                d={`M${currentX},${currentY} L${endX},${lowY} L${endX},${highY} Z`}
                fill={color}
                fillOpacity="0.09"
                stroke={color}
                strokeOpacity="0.2"
              />
              <line
                x1={currentX}
                y1={currentY}
                x2={endX}
                y2={lowY}
                stroke={color}
                strokeOpacity="0.35"
                strokeDasharray="2 4"
              />
              <line
                x1={currentX}
                y1={currentY}
                x2={endX}
                y2={highY}
                stroke={color}
                strokeOpacity="0.35"
                strokeDasharray="2 4"
              />
              <line
                x1={currentX}
                y1={currentY}
                x2={endX}
                y2={predictedY}
                stroke={color}
                strokeWidth="1.6"
                strokeDasharray="5 4"
              />
              <circle cx={endX} cy={predictedY} r="3.5" fill={color} />
              <text
                x={endX - 4}
                y={predictedY - 9}
                textAnchor="end"
                fill={color}
                fontSize="9"
                fontFamily="JetBrains Mono, monospace"
              >
                {formatCompact(forecast.predictedViews)}
              </text>
            </>
          ) : null}
          <line
            x1={currentX}
            y1={padding.top}
            x2={currentX}
            y2={padding.top + plotH}
            stroke="rgba(255,255,255,0.12)"
            strokeDasharray="2 4"
          />
          <circle cx={currentX} cy={currentY} r="3" fill="#eef4f8" />
          <text x={currentX + 5} y={currentY - 7} fill="#aab8c5" fontSize="8" fontFamily="JetBrains Mono, monospace">
            NOW
          </text>
          <text x={padding.left} y={height - 12} fill="#647586" fontSize="8" fontFamily="JetBrains Mono, monospace">
            {formatDayDate(startTime)}
          </text>
          <text x={width - padding.right} y={height - 12} textAnchor="end" fill="#647586" fontSize="8" fontFamily="JetBrains Mono, monospace">
            +{horizon}D · {formatDayDate(endTime)}
          </text>
          <text x={currentX} y={height - 12} textAnchor="middle" fill="#647586" fontSize="8" fontFamily="JetBrains Mono, monospace">
            TODAY
          </text>
        </svg>
      </div>
    </div>
  );
}

export function TimingHeatmap({ cells }: { cells: TimingCell[] }) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const blocks = [...new Set(cells.map((cell) => cell.hourBlock))].sort((a, b) => a - b);
  const active = cells.filter((cell) => cell.count > 0);
  const min = Math.min(...active.map((cell) => cell.avgScore), 100);
  const max = Math.max(...active.map((cell) => cell.avgScore), 0);
  const scale = (score: number) => (max === min ? 0.4 : (score - min) / (max - min));

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[620px]">
        <div className="grid gap-1" style={{ gridTemplateColumns: `44px repeat(${blocks.length}, minmax(0,1fr))` }}>
          <div />
          {blocks.map((block) => (
            <div key={block} className="pb-1 text-center font-mono text-[8.5px] uppercase tracking-[0.1em] text-fog-600">
              {String(block * 3).padStart(2, "0")}
            </div>
          ))}
          {days.map((day, dayIndex) => (
            <div key={day} className="contents">
              <div className="flex items-center font-mono text-[9px] uppercase tracking-[0.12em] text-fog-500">{day}</div>
              {blocks.map((block) => {
                const cell = cells.find((item) => item.day === dayIndex && item.hourBlock === block);
                const intensity = cell && cell.count > 0 ? scale(cell.avgScore) : 0;
                return (
                  <div
                    key={`${day}-${block}`}
                    title={
                      cell && cell.count > 0
                        ? `${day} ${cell.hourLabel} UTC · ${cell.count} videos · avg score ${cell.avgScore.toFixed(1)} · ${formatCompact(cell.avgViewsPerDay)} views/day`
                        : `${day} ${String(block * 3).padStart(2, "0")}–${String(block * 3 + 3).padStart(2, "0")} UTC · no data`
                    }
                    className="flex h-8 items-center justify-center rounded border border-white/[0.04] font-mono text-[9px] transition-transform hover:scale-[1.04]"
                    style={{
                      backgroundColor:
                        cell && cell.count > 0
                          ? `rgba(198, 255, 74, ${0.07 + intensity * 0.55})`
                          : "rgba(255,255,255,0.022)",
                      color: intensity > 0.55 ? "#10160a" : cell?.count ? "#d5e0e9" : "#3b4a59"
                    }}
                  >
                    {cell && cell.count > 0 ? Math.round(cell.avgScore) : "·"}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 font-mono text-[8.5px] uppercase tracking-[0.12em] text-fog-600">
          <span>Low signal</span>
          <span className="h-1.5 w-24 rounded-full bg-gradient-to-r from-lime-400/[0.08] to-lime-400/70" />
          <span>High signal</span>
          <span className="ml-auto">UTC publish time</span>
        </div>
      </div>
    </div>
  );
}

export function RegionCategoryHeatmap({
  matrix,
  regions
}: {
  matrix: HeatmapCell[];
  regions: Array<{ code: string; name: string }>;
}) {
  if (!matrix.length) return null;
  const totals = new Map<string, number>();
  for (const cell of matrix) totals.set(cell.categoryId, (totals.get(cell.categoryId) ?? 0) + cell.count);
  const categoryIds = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id]) => id);
  const scores = matrix.map((cell) => cell.score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const normalize = (score: number) => (max === min ? 0.35 : (score - min) / (max - min));
  const categoryLabel = (id: string) => CATEGORY_MAP.get(id)?.short ?? id;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[720px]">
        <div
          className="grid gap-[5px]"
          style={{ gridTemplateColumns: `128px repeat(${categoryIds.length}, minmax(0,1fr))` }}
        >
          <div className="pb-2 font-mono text-[8.5px] uppercase tracking-[0.14em] text-fog-600">Market / category</div>
          {categoryIds.map((categoryId) => (
            <div key={categoryId} className="pb-2 text-center" title={CATEGORY_MAP.get(categoryId)?.name}>
              <span className="font-mono text-[8.5px] uppercase tracking-[0.08em] text-fog-400">
                {categoryLabel(categoryId)}
              </span>
            </div>
          ))}
          {regions.map((region) => (
            <div key={region.code} className="contents">
              <div className="flex items-center gap-2 rounded-l-md bg-white/[0.02] px-2.5 py-2">
                <span className="text-[14px] leading-none">{REGION_MAP.get(region.code)?.flag ?? "🌐"}</span>
                <span className="truncate text-[11px] font-medium text-fog-200">{region.name}</span>
              </div>
              {categoryIds.map((categoryId) => {
                const cell = matrix.find((item) => item.region === region.code && item.categoryId === categoryId);
                if (!cell) {
                  return (
                    <div
                      key={`${region.code}-${categoryId}`}
                      className="flex h-[46px] items-center justify-center rounded-md border border-white/[0.03] bg-white/[0.015] font-mono text-[9px] text-fog-600"
                      title={`${region.name} · ${CATEGORY_MAP.get(categoryId)?.name ?? categoryId} · no signals`}
                    >
                      ·
                    </div>
                  );
                }
                const intensity = normalize(cell.score);
                return (
                  <div
                    key={`${region.code}-${categoryId}`}
                    title={`${region.name} · ${CATEGORY_MAP.get(categoryId)?.name ?? categoryId}\nAvg score ${cell.score.toFixed(1)} · ${cell.count} videos · ${formatCompact(cell.viewsPerDay)} views/day`}
                    className="flex h-[46px] flex-col items-center justify-center rounded-md border border-white/[0.04] transition-transform hover:scale-[1.03]"
                    style={{
                      backgroundColor: `rgba(198, 255, 74, ${0.04 + intensity * 0.48})`,
                      color: intensity > 0.52 ? "#10160a" : "#d5e0e9"
                    }}
                  >
                    <span className="font-mono text-[11px] font-semibold tabular">{Math.round(cell.score)}</span>
                    <span className={`font-mono text-[7.5px] ${intensity > 0.52 ? "text-ink-900/65" : "text-fog-500"}`}>
                      {cell.count} sig
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 font-mono text-[8.5px] uppercase tracking-[0.12em] text-fog-600">
          <span>Lower</span>
          <span className="h-1.5 w-24 rounded-full bg-gradient-to-r from-lime-400/[0.06] to-lime-400/60" />
          <span>Higher avg signal score</span>
          <span className="ml-auto">Candidate pool · pre-precision</span>
        </div>
      </div>
    </div>
  );
}
