"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { MAX_REGIONS, REGIONS, REGION_PACKS } from "@/lib/constants";
import { Modal } from "./Modal";

export function RegionModal({
  open,
  onClose,
  selected,
  onApply
}: {
  open: boolean;
  onClose: () => void;
  selected: string[];
  onApply: (codes: string[]) => void;
}) {
  const [draft, setDraft] = useState<string[]>(selected);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (open) {
      setDraft(selected);
      setQuery("");
    }
  }, [open, selected]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return REGIONS;
    return REGIONS.filter(
      (region) =>
        region.name.toLowerCase().includes(normalized) ||
        region.code.toLowerCase().includes(normalized)
    );
  }, [query]);

  function toggle(code: string) {
    setDraft((current) => {
      if (current.includes(code)) return current.filter((item) => item !== code);
      if (current.length >= MAX_REGIONS) return current;
      return [...current, code];
    });
  }

  function choosePack(codes: string[]) {
    setDraft(codes.filter((code) => REGIONS.some((region) => region.code === code)).slice(0, MAX_REGIONS));
  }

  const limitReached = draft.length >= MAX_REGIONS;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Select markets"
      subtitle="Every selected market adds a regional YouTube chart to the scan. Up to 12 markets."
      wide
      footer={
        <>
          <span className="mr-auto font-mono text-[10px] uppercase tracking-[0.12em] text-fog-500">
            {draft.length} / {MAX_REGIONS} selected
          </span>
          <button type="button" onClick={onClose} className="btn-ghost !px-3 !py-2">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onApply(draft);
              onClose();
            }}
            disabled={draft.length === 0}
            className="btn-primary !px-4 !py-2"
          >
            Apply markets
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fog-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search 100+ markets by name or code…"
            className="input-field !pl-9"
            autoFocus
          />
        </div>

        <div>
          <div className="eyebrow mb-2">Quick packs</div>
          <div className="flex flex-wrap gap-1.5">
            {REGION_PACKS.map((pack) => {
              const active = pack.codes.length === draft.length && pack.codes.every((code) => draft.includes(code));
              return (
                <button
                  key={pack.name}
                  type="button"
                  title={pack.description}
                  onClick={() => choosePack(pack.codes)}
                  className={`chip-button ${active ? "chip-active" : ""}`}
                >
                  {pack.name}
                  <span className="font-mono text-[8.5px] text-fog-600">{pack.codes.length}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setDraft([])}
              className="chip-button"
            >
              Clear all
            </button>
          </div>
        </div>

        <div className="grid max-h-[380px] grid-cols-1 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((region) => {
            const active = draft.includes(region.code);
            const disabled = !active && limitReached;
            return (
              <button
                key={region.code}
                type="button"
                disabled={disabled}
                onClick={() => toggle(region.code)}
                className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors ${
                  active
                    ? "border-lime-400/35 bg-lime-400/[0.09]"
                    : disabled
                      ? "border-white/[0.04] bg-transparent opacity-40"
                      : "border-white/[0.07] bg-white/[0.025] hover:border-white/[0.15] hover:bg-white/[0.05]"
                }`}
              >
                <span className="text-base leading-none">{region.flag}</span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-[12px] ${active ? "text-lime-200" : "text-fog-200"}`}>
                    {region.name}
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fog-600">{region.code}</span>
                </span>
                {active ? (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-lime-400 text-ink-950">
                    <Check size={10} strokeWidth={3} />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        {limitReached ? (
          <p className="text-[10.5px] text-amber-400/90">
            Market limit reached. Remove one to add another — the API fan-out grows with every market.
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
