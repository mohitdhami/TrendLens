"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  suffix,
  hint,
  icon: Icon,
  accent = "#c6ff4a",
  children
}: {
  label: string;
  value: ReactNode;
  suffix?: string;
  hint?: ReactNode;
  icon?: LucideIcon;
  accent?: string;
  children?: ReactNode;
}) {
  return (
    <div className="panel relative overflow-hidden px-3.5 py-3.5 sm:px-4">
      <div
        className="pointer-events-none absolute -right-7 -top-8 h-20 w-20 rounded-full opacity-[0.13] blur-2xl"
        style={{ backgroundColor: accent }}
      />
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[8.5px] font-medium uppercase tracking-[0.16em] text-fog-500">
          {label}
        </span>
        {Icon ? (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-white/[0.06] bg-white/[0.025]" style={{ color: accent }}>
            <Icon size={12} strokeWidth={1.9} />
          </span>
        ) : null}
      </div>
      <div className="mt-2.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
        <span className="stat-number">{value}</span>
        {suffix ? <span className="font-mono text-[10px] text-fog-500">{suffix}</span> : null}
      </div>
      {hint ? <div className="mt-1.5 text-[10.5px] leading-snug text-fog-500">{hint}</div> : null}
      {children}
    </div>
  );
}
