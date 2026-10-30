"use client";

import { useEffect, useState } from "react";
import { Check, ExternalLink, Eye, EyeOff, KeyRound, ShieldCheck, Trash2 } from "lucide-react";
import type { DataMode } from "@/lib/types";
import { Modal } from "./Modal";

const MODES: Array<{ value: DataMode; title: string; description: string }> = [
  {
    value: "auto",
    title: "Auto",
    description: "Use live charts when a key is available; otherwise run the demo dataset."
  },
  {
    value: "live",
    title: "Live only",
    description: "Request YouTube regional charts. Falls back to demo with a warning if the call fails."
  },
  {
    value: "demo",
    title: "Demo data",
    description: "Deterministic synthetic data with full histories. No API calls, no key required."
  }
];

export function SettingsModal({
  open,
  onClose,
  apiKey,
  mode,
  serverKey,
  onSave
}: {
  open: boolean;
  onClose: () => void;
  apiKey: string;
  mode: DataMode;
  serverKey: boolean;
  onSave: (apiKey: string, mode: DataMode) => void;
}) {
  const [draftKey, setDraftKey] = useState(apiKey);
  const [draftMode, setDraftMode] = useState<DataMode>(mode);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setDraftKey(apiKey);
      setDraftMode(mode);
      setVisible(false);
    }
  }, [open, apiKey, mode]);

  const keyAvailable = Boolean(draftKey.trim() || serverKey);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Data sources"
      subtitle="Run on live YouTube regional charts or explore the built-in deterministic dataset."
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-ghost !px-3 !py-2">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onSave(draftKey.trim(), draftMode);
              onClose();
            }}
            className="btn-primary !px-4 !py-2"
          >
            Save & scan
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.025] p-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-lime-400/10 text-lime-300">
            <ShieldCheck size={16} />
          </span>
          <div className="text-[11.5px] leading-relaxed text-fog-300">
            <span className="font-semibold text-fog-100">Your key stays in your browser.</span> It is sent only with each
            analysis request to your own app backend, never persisted server-side. Live chart reads consume YouTube Data
            API quota.
          </div>
        </div>

        <div>
          <div className="eyebrow mb-2">Source mode</div>
          <div className="grid gap-2">
            {MODES.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setDraftMode(item.value)}
                className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                  draftMode === item.value
                    ? "border-lime-400/35 bg-lime-400/[0.07]"
                    : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.14]"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                    draftMode === item.value ? "border-lime-400 bg-lime-400 text-ink-950" : "border-white/20"
                  }`}
                >
                  {draftMode === item.value ? <Check size={10} strokeWidth={3} /> : null}
                </span>
                <span>
                  <span className={`block text-[12px] font-semibold ${draftMode === item.value ? "text-lime-200" : "text-fog-200"}`}>
                    {item.title}
                  </span>
                  <span className="mt-0.5 block text-[10.5px] leading-relaxed text-fog-500">{item.description}</span>
                </span>
                {item.value === "live" && !keyAvailable ? (
                  <span className="ml-auto shrink-0 font-mono text-[8px] uppercase tracking-[0.1em] text-amber-400">Key needed</span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="eyebrow">YouTube Data API v3 key</span>
            {serverKey ? (
              <span className="inline-flex items-center gap-1 font-mono text-[8.5px] uppercase tracking-[0.1em] text-lime-300">
                <span className="h-1 w-1 rounded-full bg-lime-400" />
                Server key detected
              </span>
            ) : null}
          </div>
          <div className="relative">
            <KeyRound size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fog-500" />
            <input
              type={visible ? "text" : "password"}
              value={draftKey}
              onChange={(event) => setDraftKey(event.target.value)}
              placeholder={serverKey ? "Using server key — paste to override" : "AIza…"}
              className="input-field !pl-9 !pr-16 font-mono !text-[11.5px]"
              autoComplete="off"
              spellCheck={false}
            />
            <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center">
              {draftKey ? (
                <button
                  type="button"
                  onClick={() => setDraftKey("")}
                  className="rounded p-1.5 text-fog-500 hover:bg-white/[0.06] hover:text-coral-400"
                  title="Clear key"
                >
                  <Trash2 size={12} />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setVisible((value) => !value)}
                className="rounded p-1.5 text-fog-500 hover:bg-white/[0.06] hover:text-fog-200"
                title={visible ? "Hide key" : "Show key"}
              >
                {visible ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-fog-500">
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-lime-300/90 transition-colors hover:text-lime-300"
            >
              Get a key <ExternalLink size={9} />
            </a>
            <span>Enable “YouTube Data API v3”. A chart read costs 1 quota unit.</span>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.07] bg-ink-900/60 p-3">
          <div className="eyebrow mb-2">Quota planning</div>
          <div className="grid grid-cols-2 gap-2 text-[10.5px] text-fog-400">
            <div className="rounded-lg bg-white/[0.025] px-2.5 py-2">
              <div className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-fog-600">Standard scan</div>
              <div className="mt-1 text-fog-200">6 markets × 1 chart = 6 units</div>
            </div>
            <div className="rounded-lg bg-white/[0.025] px-2.5 py-2">
              <div className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-fog-600">Maximum scan</div>
              <div className="mt-1 text-fog-200">12 markets × 4 categories = 48 units</div>
            </div>
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-fog-500">
            Results are cached in memory for 20 minutes. Snapshot history is stored locally in <code className="text-fog-400">.data/history.json</code> to
            power momentum and forecast calibration.
          </p>
        </div>
      </div>
    </Modal>
  );
}
