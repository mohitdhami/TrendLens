"use client";

import { ChevronDown, RotateCcw, ScanLine, Settings2, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import { CATEGORIES, precisionBand, REGION_MAP } from "@/lib/constants";
import { precisionLimit, weightsFor } from "@/lib/analytics/score";
import { clamp } from "@/lib/utils";
import type { Filters } from "@/lib/types";
import { Badge } from "./ui";

interface FilterPanelProps {
  filters: Filters;
  includeText: string;
  excludeText: string;
  onFiltersChange: (filters: Filters) => void;
  onIncludeTextChange: (value: string) => void;
  onExcludeTextChange: (value: string) => void;
  onOpenRegions: () => void;
  onOpenSettings: () => void;
  onRun: () => void;
  onReset: () => void;
  running: boolean;
  dirty: boolean;
}

function Segmented({
  options,
  value,
  onChange
}: {
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-1 rounded-lg border border-white/[0.07] bg-ink-900/70 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-md px-1 py-1.5 text-[10.5px] font-medium transition-colors ${
            value === option.value ? "bg-white/[0.09] text-fog-100" : "text-fog-500 hover:text-fog-200"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function FilterPanel({
  filters,
  includeText,
  excludeText,
  onFiltersChange,
  onIncludeTextChange,
  onExcludeTextChange,
  onOpenRegions,
  onOpenSettings,
  onRun,
  onReset,
  running,
  dirty
}: FilterPanelProps) {
  const [advancedOpen, setAdvancedOpen] = useState(true);
  const band = precisionBand(filters.precision);
  const weights = weightsFor(filters.precision, includeText.trim().length > 0);
  const effective = precisionLimit(filters.limit, filters.precision);
  const selectedRegions = filters.regions
    .map((code) => REGION_MAP.get(code))
    .filter((region): region is NonNullable<typeof region> => Boolean(region));

  function toggleCategory(categoryId: string) {
    const has = filters.categories.includes(categoryId);
    if (has) {
      onFiltersChange({ ...filters, categories: filters.categories.filter((id) => id !== categoryId) });
      return;
    }
    if (filters.categories.length >= 4) return;
    onFiltersChange({ ...filters, categories: [...filters.categories, categoryId] });
  }

  function removeRegion(code: string) {
    if (filters.regions.length <= 1) return;
    onFiltersChange({ ...filters, regions: filters.regions.filter((region) => region !== code) });
  }

  return (
    <aside className="panel overflow-hidden lg:sticky lg:top-24">
      <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-lime-400/20 bg-lime-400/[0.08] text-lime-300">
            <SlidersHorizontal size={14} />
          </span>
          <div>
            <div className="text-[12.5px] font-semibold text-fog-100">Analysis desk</div>
            <div className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-fog-500">Precision controls</div>
          </div>
        </div>
        <button type="button" onClick={onReset} className="text-fog-500 transition-colors hover:text-fog-200" title="Reset all filters">
          <RotateCcw size={13} />
        </button>
      </div>

      <div className="space-y-5 px-4 py-4">
        <div>
          <div className="label">
            <span>Markets</span>
            <button type="button" onClick={onOpenRegions} className="text-[10px] font-medium normal-case tracking-normal text-lime-300 hover:text-lime-200">
              Edit ({filters.regions.length})
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selectedRegions.slice(0, 5).map((region) => (
              <span key={region.code} className="inline-flex items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.03] py-1 pl-1.5 pr-1 text-[10.5px] text-fog-200">
                <span className="text-[12px] leading-none">{region.flag}</span>
                {region.code}
                {filters.regions.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeRegion(region.code)}
                    className="ml-0.5 rounded p-0.5 text-fog-600 hover:bg-white/[0.08] hover:text-fog-200"
                    aria-label={`Remove ${region.name}`}
                  >
                    <X size={9} />
                  </button>
                ) : null}
              </span>
            ))}
            {selectedRegions.length > 5 ? (
              <button type="button" onClick={onOpenRegions} className="chip-button">
                +{selectedRegions.length - 5} more
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onOpenRegions}
            className="mt-2 w-full rounded-lg border border-dashed border-white/[0.09] py-1.5 text-[10.5px] text-fog-500 transition-colors hover:border-lime-400/25 hover:text-lime-300"
          >
            Add or change markets · up to 12
          </button>
        </div>

        <div>
          <div className="label">
            <span>Categories</span>
            <button
              type="button"
              onClick={() => onFiltersChange({ ...filters, categories: [] })}
              className={`text-[10px] font-medium normal-case tracking-normal ${
                filters.categories.length === 0 ? "text-fog-600" : "text-lime-300 hover:text-lime-200"
              }`}
            >
              All
            </button>
          </div>
          <div className="flex max-h-[138px] flex-wrap gap-1 overflow-y-auto pr-1">
            <button
              type="button"
              onClick={() => onFiltersChange({ ...filters, categories: [] })}
              className={`rounded-md border px-2 py-1 text-[10.5px] transition-colors ${
                filters.categories.length === 0
                  ? "border-lime-400/35 bg-lime-400/10 text-lime-300"
                  : "border-white/[0.07] bg-white/[0.025] text-fog-400 hover:text-fog-200"
              }`}
            >
              All categories
            </button>
            {CATEGORIES.map((category) => {
              const active = filters.categories.includes(category.id);
              const disabled = !active && filters.categories.length >= 4;
              return (
                <button
                  key={category.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleCategory(category.id)}
                  title={disabled ? "Maximum 4 categories" : category.name}
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10.5px] transition-colors ${
                    active
                      ? "border-white/[0.16] bg-white/[0.07] text-fog-100"
                      : disabled
                        ? "border-white/[0.04] bg-transparent text-fog-600"
                        : "border-white/[0.07] bg-white/[0.025] text-fog-400 hover:text-fog-200"
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: category.color }} />
                  {category.short}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-[10px] leading-relaxed text-fog-600">All = broad sweep. Pick up to 4 to focus the charts.</p>
        </div>

        <div className="rounded-xl border border-white/[0.07] bg-ink-900/50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-fog-500">Precision</span>
            <span className="font-mono text-[11px] font-semibold text-lime-300">{band.value}</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={filters.precision}
            onChange={(event) => onFiltersChange({ ...filters, precision: clamp(Number(event.target.value), 0, 100) })}
            className="precision-range mb-3"
            style={{ "--progress": `${filters.precision}%` } as React.CSSProperties}
            aria-label="Precision level"
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-fog-100">{band.label}</span>
            <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-fog-500">≈{effective} signals</span>
          </div>
          <p className="mt-1 text-[10.5px] leading-relaxed text-fog-400">{band.blurb}</p>

          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {[
              { key: "velocity" as const, label: "Velocity", color: "#c6ff4a" },
              { key: "momentum" as const, label: "Momentum", color: "#4ae3c6" },
              { key: "engagement" as const, label: "Engage", color: "#ffbd5c" }
            ].map((item) => (
              <div key={item.key} className="rounded-md bg-white/[0.025] px-1.5 py-1.5">
                <div className="font-mono text-[8px] uppercase tracking-[0.1em] text-fog-500">{item.label}</div>
                <div className="mt-1 flex items-center gap-1">
                  <span className="h-1 w-full overflow-hidden rounded-full bg-white/[0.07]">
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${Math.round(weights[item.key] * 100)}%`, backgroundColor: item.color }}
                    />
                  </span>
                  <span className="font-mono text-[8.5px] text-fog-400">{Math.round(weights[item.key] * 100)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setAdvancedOpen((open) => !open)}
            className="flex w-full items-center justify-between text-[11px] font-medium uppercase tracking-[0.12em] text-fog-400 transition-colors hover:text-fog-200"
          >
            <span>Advanced filters</span>
            <ChevronDown size={13} className={`transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
          </button>
          {advancedOpen ? (
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label !mb-1.5 !text-[9.5px]">Min views</label>
                  <select
                    value={filters.minViews}
                    onChange={(event) => onFiltersChange({ ...filters, minViews: Number(event.target.value) })}
                    className="select-field !py-1.5 !text-[11px]"
                  >
                    <option value={0}>No floor</option>
                    <option value={10_000}>10K</option>
                    <option value={100_000}>100K</option>
                    <option value={500_000}>500K</option>
                    <option value={1_000_000}>1M</option>
                  </select>
                </div>
                <div>
                  <label className="label !mb-1.5 !text-[9.5px]">Max age</label>
                  <select
                    value={filters.maxAgeDays}
                    onChange={(event) => onFiltersChange({ ...filters, maxAgeDays: Number(event.target.value) })}
                    className="select-field !py-1.5 !text-[11px]"
                  >
                    <option value={7}>7 days</option>
                    <option value={14}>14 days</option>
                    <option value={30}>30 days</option>
                    <option value={60}>60 days</option>
                    <option value={90}>90 days</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label !mb-1.5 !text-[9.5px]">Format</label>
                <Segmented
                  options={[
                    { value: "any", label: "Any" },
                    { value: "short", label: "≤60s" },
                    { value: "medium", label: "1–8m" },
                    { value: "long", label: "8m+" }
                  ]}
                  value={filters.duration}
                  onChange={(value) => onFiltersChange({ ...filters, duration: value as Filters["duration"] })}
                />
              </div>

              <div>
                <label className="label !mb-1.5 !text-[9.5px]">Focus keywords</label>
                <input
                  value={includeText}
                  onChange={(event) => onIncludeTextChange(event.target.value)}
                  placeholder="AI agents, cricket, K-pop"
                  className="input-field !py-1.5 !text-[11px]"
                />
                <p className="mt-1 text-[9.5px] text-fog-600">Comma separated. Ranks relevance; falls back if too narrow.</p>
              </div>

              <div>
                <label className="label !mb-1.5 !text-[9.5px]">Exclude keywords</label>
                <input
                  value={excludeText}
                  onChange={(event) => onExcludeTextChange(event.target.value)}
                  placeholder="drama, giveaway, reaction"
                  className="input-field !py-1.5 !text-[11px]"
                />
              </div>

              <div>
                <label className="label !mb-1.5 !text-[9.5px]">Signal cap</label>
                <select
                  value={filters.limit}
                  onChange={(event) => onFiltersChange({ ...filters, limit: Number(event.target.value) })}
                  className="select-field !py-1.5 !text-[11px]"
                >
                  <option value={12}>12 signals</option>
                  <option value={24}>24 signals</option>
                  <option value={36}>36 signals</option>
                  <option value={48}>48 signals</option>
                  <option value={60}>60 signals</option>
                </select>
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-2 pt-1">
          <button type="button" onClick={onRun} disabled={running} className="btn-primary w-full" aria-busy={running}>
            {running ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink-950/30 border-t-ink-950" />
                Scanning markets…
              </>
            ) : (
              <>
                <ScanLine size={15} />
                {dirty ? "Apply filters & scan" : "Refresh signal scan"}
              </>
            )}
          </button>
          {dirty ? (
            <p className="text-center font-mono text-[9px] uppercase tracking-[0.12em] text-amber-400">
              Filters changed since last scan
            </p>
          ) : (
            <button type="button" onClick={onOpenSettings} className="flex w-full items-center justify-center gap-1.5 text-[10px] text-fog-500 transition-colors hover:text-fog-200">
              <Settings2 size={11} />
              Data source & API settings
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-white/[0.06] bg-white/[0.015] px-4 py-2.5">
        <span className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-fog-600">Precision engine</span>
        <Badge variant="lime" dot>v1.3</Badge>
      </div>
    </aside>
  );
}
