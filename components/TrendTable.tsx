"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight } from "lucide-react";
import { CATEGORY_MAP } from "@/lib/constants";
import { formatAge, formatCompact, formatGrowth, formatPercent, scoreBand } from "@/lib/format";
import type { TrendVideo } from "@/lib/types";
import { Sparkline } from "./charts";
import { RegionFlags, ScoreBar, TrajectoryBadge } from "./ui";
import { VideoArtwork } from "./VideoArtwork";

type SortKey = "trendScore" | "momentum" | "views" | "viewsPerDay" | "engagementRate" | "breakoutProbability";

export function TrendTable({
  videos,
  onSelect,
  limit = 10,
  dense = false
}: {
  videos: TrendVideo[];
  onSelect: (video: TrendVideo) => void;
  limit?: number;
  dense?: boolean;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("trendScore");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const rows = [...videos].sort((a, b) => {
      const aValue = sortKey === "trendScore" ? a.trendScore : a[sortKey];
      const bValue = sortKey === "trendScore" ? b.trendScore : b[sortKey];
      return direction === "desc" ? bValue - aValue : aValue - bValue;
    });
    return rows.slice(0, limit);
  }, [videos, sortKey, direction, limit]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setDirection((current) => (current === "desc" ? "asc" : "desc"));
      return;
    }
    setSortKey(key);
    setDirection("desc");
  }

  return (
    <>
      <div className="divide-y divide-white/[0.055] md:hidden">
        {sorted.map((video, index) => {
          const category = CATEGORY_MAP.get(video.categoryId);
          const forecast = video.forecasts.find((item) => item.horizonDays === 7);
          return (
            <button
              key={video.id}
              type="button"
              onClick={() => onSelect(video)}
              className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.03]"
            >
              <span className="relative w-16 shrink-0">
                <VideoArtwork video={video} variant="thumb" />
                <span className="absolute -left-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded border border-white/10 bg-ink-950/90 px-1 font-mono text-[8px] text-fog-400">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-start justify-between gap-2">
                  <span className="line-clamp-2 text-[11.5px] font-medium leading-snug text-fog-100">
                    {video.title}
                  </span>
                  <span className={`shrink-0 font-mono text-[12px] font-semibold tabular ${scoreBand(video.trendScore).text}`}>
                    {video.trendScore.toFixed(1)}
                  </span>
                </span>
                <span className="mt-1 flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.08em] text-fog-600">
                  <span className="h-1 w-1 rounded-full" style={{ backgroundColor: category?.color ?? "#8495a5" }} />
                  <span>{category?.short ?? "General"}</span>
                  <span>·</span>
                  <span>{video.format === "short" ? "Short" : "Long"}</span>
                  <span>·</span>
                  <span>{formatAge(video.ageDays)}</span>
                </span>
                <span className="mt-1.5 flex flex-wrap items-center gap-2">
                  <RegionFlags codes={video.regions} max={3} />
                  <span className="font-mono text-[9px] text-lime-300">{formatGrowth(video.momentum)}</span>
                  <span className="font-mono text-[9px] text-fog-500">{formatCompact(video.views)} views</span>
                  {forecast ? (
                    <span className="font-mono text-[8.5px] text-fog-600">
                      {formatPercent((forecast.predictedViews / Math.max(1, video.views) - 1) * 100, true)} 7d
                    </span>
                  ) : null}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] border-collapse">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="thead-cell w-10 pl-4">#</th>
              <th className="thead-cell">Signal</th>
              <th className="thead-cell hidden xl:table-cell">Markets</th>
              <th className="thead-cell">
                <SortButton
                  label="Score"
                  active={sortKey === "trendScore"}
                  direction={direction}
                  onClick={() => toggleSort("trendScore")}
                />
              </th>
              <th className="thead-cell">
                <SortButton
                  label="Momentum"
                  active={sortKey === "momentum"}
                  direction={direction}
                  onClick={() => toggleSort("momentum")}
                />
              </th>
              <th className="thead-cell hidden lg:table-cell">
                <SortButton
                  label="Views"
                  active={sortKey === "views"}
                  direction={direction}
                  onClick={() => toggleSort("views")}
                />
              </th>
              <th className="thead-cell hidden xl:table-cell">
                <SortButton
                  label="Engage"
                  active={sortKey === "engagementRate"}
                  direction={direction}
                  onClick={() => toggleSort("engagementRate")}
                />
              </th>
              <th className="thead-cell hidden md:table-cell">Trend</th>
              <th className="thead-cell hidden 2xl:table-cell">
                <SortButton
                  label="Breakout"
                  active={sortKey === "breakoutProbability"}
                  direction={direction}
                  onClick={() => toggleSort("breakoutProbability")}
                />
              </th>
              <th className="thead-cell w-8 pr-4" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((video, index) => {
              const category = CATEGORY_MAP.get(video.categoryId);
              const forecast = video.forecasts.find((item) => item.horizonDays === 7);
              return (
                <tr
                  key={video.id}
                  onClick={() => onSelect(video)}
                  className="data-row group cursor-pointer"
                >
                  <td className={`${dense ? "py-2.5" : "py-3"} pl-4 pr-1`}>
                    <span className="font-mono text-[10.5px] tabular text-fog-600 group-hover:text-fog-400">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </td>
                  <td className="tbody-cell min-w-[260px] !py-2.5">
                    <div className="flex items-center gap-2.5">
                      <VideoArtwork video={video} variant="thumb" className="w-[72px] shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: category?.color ?? "#8495a5" }}
                          />
                          <span className="truncate font-mono text-[8.5px] uppercase tracking-[0.13em] text-fog-500">
                            {category?.short ?? "General"} · {video.format === "short" ? "Short" : "Long"}
                          </span>
                        </div>
                        <div className="mt-1 line-clamp-1 text-[12px] font-medium text-fog-100 transition-colors group-hover:text-lime-200">
                          {video.title}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-fog-500">
                          <span className="truncate">{video.channelTitle}</span>
                          <span className="text-fog-600">·</span>
                          <span className="shrink-0">{formatAge(video.ageDays)}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="tbody-cell hidden xl:table-cell">
                    <RegionFlags codes={video.regions} max={3} />
                  </td>
                  <td className="tbody-cell">
                    <div className="flex items-center gap-2">
                      <ScoreBar score={video.trendScore} width="w-12" />
                      <span className={`font-mono text-[12px] font-semibold tabular ${scoreBand(video.trendScore).text}`}>
                        {video.trendScore.toFixed(1)}
                      </span>
                    </div>
                  </td>
                  <td className="tbody-cell">
                    <div className="flex items-center gap-2">
                      <Sparkline
                        values={video.history.map((point) => point.views)}
                        width={48}
                        height={20}
                        color={video.momentum >= 0 ? "#c6ff4a" : "#ff7c6b"}
                      />
                      <span
                        className={`font-mono text-[11px] tabular ${
                          video.momentum >= 0.25 ? "text-lime-300" : video.momentum >= 0 ? "text-fog-200" : "text-coral-400"
                        }`}
                      >
                        {formatGrowth(video.momentum)}
                      </span>
                    </div>
                  </td>
                  <td className="tbody-cell hidden lg:table-cell">
                    <div className="font-mono text-[11px] tabular text-fog-200">{formatCompact(video.views)}</div>
                    <div className="mt-0.5 font-mono text-[9px] text-fog-600">{formatCompact(video.viewsPerDay)}/day</div>
                  </td>
                  <td className="tbody-cell hidden xl:table-cell">
                    <span className="font-mono text-[11px] tabular text-fog-300">
                      {formatPercent(video.engagementRate)}
                    </span>
                  </td>
                  <td className="tbody-cell hidden md:table-cell">
                    <TrajectoryBadge trajectory={video.trajectory} />
                    {forecast ? (
                      <div className="mt-1 font-mono text-[9px] text-fog-600">
                        {formatPercent((forecast.predictedViews / Math.max(1, video.views) - 1) * 100, true)} 7d
                      </div>
                    ) : null}
                  </td>
                  <td className="tbody-cell hidden 2xl:table-cell">
                    <div className="flex items-center gap-2">
                      <div className="progress-track w-10">
                        <div
                          className="h-full rounded-full bg-mint-400"
                          style={{ width: `${Math.max(3, video.breakoutProbability * 100)}%` }}
                        />
                      </div>
                      <span className="font-mono text-[10px] tabular text-fog-400">
                        {Math.round(video.breakoutProbability * 100)}%
                      </span>
                    </div>
                  </td>
                  <td className="tbody-cell w-8 pr-4 text-right">
                    <ChevronRight
                      size={13}
                      className="inline text-fog-600 transition-transform group-hover:translate-x-0.5 group-hover:text-lime-300"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function SortButton({
  label,
  active,
  direction,
  onClick
}: {
  label: string;
  active: boolean;
  direction: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 whitespace-nowrap transition-colors hover:text-fog-200 ${
        active ? "text-fog-200" : "text-fog-500"
      }`}
    >
      {label}
      {active ? (
        direction === "desc" ? (
          <ArrowDown size={9} />
        ) : (
          <ArrowUp size={9} />
        )
      ) : (
        <ArrowUpDown size={9} className="opacity-50" />
      )}
    </button>
  );
}
