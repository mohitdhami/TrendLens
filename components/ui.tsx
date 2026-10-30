"use client";

import { useState, type ReactNode } from "react";
import {
  BarChart3,
  Car,
  Check,
  Clapperboard,
  Copy,
  Cpu,
  Gamepad2,
  GraduationCap,
  HeartHandshake,
  Laugh,
  Music2,
  Newspaper,
  PawPrint,
  Plane,
  Sparkles,
  Trophy,
  User,
  Wand2,
  type LucideIcon
} from "lucide-react";
import { CATEGORY_MAP, REGION_MAP } from "@/lib/constants";
import { scoreBand } from "@/lib/format";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "10": Music2,
  "20": Gamepad2,
  "24": Sparkles,
  "27": GraduationCap,
  "28": Cpu,
  "23": Laugh,
  "17": Trophy,
  "25": Newspaper,
  "26": Wand2,
  "22": User,
  "1": Clapperboard,
  "2": Car,
  "15": PawPrint,
  "19": Plane,
  "29": HeartHandshake
};

export function CategoryGlyph({
  categoryId,
  size = 14,
  className = ""
}: {
  categoryId: string;
  size?: number;
  className?: string;
}) {
  const Icon = CATEGORY_ICONS[categoryId] ?? BarChart3;
  const color = CATEGORY_MAP.get(categoryId)?.color ?? "#8495a5";
  return <Icon size={size} className={className} style={{ color }} strokeWidth={1.9} />;
}

export function CategoryLabel({ categoryId, className = "" }: { categoryId: string; className?: string }) {
  const category = CATEGORY_MAP.get(categoryId);
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: category?.color ?? "#8495a5" }}
      />
      {category?.name ?? "General"}
    </span>
  );
}

export function RegionFlags({
  codes,
  max = 4,
  showNames = false,
  className = ""
}: {
  codes: string[];
  max?: number;
  showNames?: boolean;
  className?: string;
}) {
  const shown = codes.slice(0, max);
  const rest = codes.length - shown.length;
  return (
    <span className={`inline-flex flex-wrap items-center gap-1 ${className}`}>
      {shown.map((code) => (
        <span
          key={code}
          title={REGION_MAP.get(code)?.name ?? code}
          className="inline-flex items-center gap-1 rounded-md border border-white/[0.07] bg-white/[0.03] px-1.5 py-0.5 text-[10.5px] text-fog-300"
        >
          <span className="text-[12px] leading-none">{REGION_MAP.get(code)?.flag ?? "🌐"}</span>
          {showNames ? <span>{REGION_MAP.get(code)?.name ?? code}</span> : <span>{code}</span>}
        </span>
      ))}
      {rest > 0 ? (
        <span className="rounded-md border border-white/[0.07] bg-white/[0.03] px-1.5 py-0.5 font-mono text-[10px] text-fog-400">
          +{rest}
        </span>
      ) : null}
    </span>
  );
}

export type BadgeVariant = "lime" | "mint" | "amber" | "coral" | "neutral" | "violet" | "sky";

const BADGE_STYLES: Record<BadgeVariant, string> = {
  lime: "border-lime-400/25 bg-lime-400/10 text-lime-300",
  mint: "border-mint-400/25 bg-mint-400/10 text-mint-300",
  amber: "border-amber-400/25 bg-amber-400/10 text-amber-400",
  coral: "border-coral-400/25 bg-coral-400/10 text-coral-400",
  neutral: "border-white/[0.08] bg-white/[0.04] text-fog-300",
  violet: "border-[#9b8cff]/25 bg-[#9b8cff]/10 text-[#c3b9ff]",
  sky: "border-sky-400/25 bg-sky-400/10 text-sky-300"
};

export function Badge({
  children,
  variant = "neutral",
  className = "",
  dot = false
}: {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[9.5px] font-medium uppercase tracking-[0.1em] ${BADGE_STYLES[variant]} ${className}`}
    >
      {dot ? <span className="h-1 w-1 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}

export function CopyButton({
  text,
  label = "Copy",
  copiedLabel = "Copied",
  variant = "ghost",
  className = ""
}: {
  text: string;
  label?: string;
  copiedLabel?: string;
  variant?: "ghost" | "secondary";
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(event: React.MouseEvent) {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`${
        variant === "secondary"
          ? "btn-secondary !px-3 !py-1.5 text-[11px]"
          : "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10.5px] font-medium text-fog-400 transition-colors hover:bg-white/[0.06] hover:text-fog-100"
      } ${className}`}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? copiedLabel : label}
    </button>
  );
}

export function ScoreBar({
  score,
  width = "w-16",
  showLabel = false
}: {
  score: number;
  width?: string;
  showLabel?: boolean;
}) {
  const band = scoreBand(score);
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`progress-track ${width}`}>
        <span
          className="block h-full rounded-full transition-all"
          style={{ width: `${Math.max(3, Math.min(100, score))}%`, backgroundColor: band.hex }}
        />
      </span>
      {showLabel ? (
        <span className={`font-mono text-[11px] font-medium tabular ${band.text}`}>{score.toFixed(1)}</span>
      ) : null}
    </span>
  );
}

export function Meter({
  value,
  color = "#c6ff4a",
  height = "h-1.5",
  className = ""
}: {
  value: number;
  color?: string;
  height?: string;
  className?: string;
}) {
  return (
    <div className={`${height} overflow-hidden rounded-full bg-white/[0.06] ${className}`}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.max(2, Math.min(100, value))}%`, backgroundColor: color }}
      />
    </div>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className = ""
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-4 ${className}`}>
      <div>
        {eyebrow ? <div className="eyebrow mb-2">{eyebrow}</div> : null}
        <h2 className="font-display text-xl font-semibold tracking-tight text-fog-100">{title}</h2>
        {description ? <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-fog-400">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function PanelHeading({
  title,
  eyebrow,
  description,
  action,
  className = ""
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        {eyebrow ? (
          <div className="mb-1 font-mono text-[8.5px] uppercase tracking-[0.16em] text-fog-600">{eyebrow}</div>
        ) : null}
        <h3 className="font-display text-[14px] font-semibold tracking-tight text-fog-100">{title}</h3>
        {description ? <p className="mt-1 text-[10.5px] leading-relaxed text-fog-500">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="panel flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-fog-400">
        {icon ?? <BarChart3 size={18} />}
      </div>
      <h3 className="font-display text-base font-semibold text-fog-100">{title}</h3>
      <p className="mt-1 max-w-md text-[12.5px] leading-relaxed text-fog-400">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ConfidenceBadge({ confidence }: { confidence: "high" | "medium" | "low" }) {
  const map = {
    high: { label: "High confidence", variant: "lime" as const },
    medium: { label: "Medium", variant: "amber" as const },
    low: { label: "Low confidence", variant: "neutral" as const }
  };
  const item = map[confidence];
  return <Badge variant={item.variant} dot>{item.label}</Badge>;
}

const TRAJECTORY_META = {
  rising: { label: "Rising", variant: "lime" as const },
  spike: { label: "Spiking", variant: "amber" as const },
  steady: { label: "Steady", variant: "neutral" as const },
  fading: { label: "Fading", variant: "coral" as const }
};

export function TrajectoryBadge({
  trajectory,
  className = ""
}: {
  trajectory: "rising" | "steady" | "spike" | "fading";
  className?: string;
}) {
  const item = TRAJECTORY_META[trajectory];
  return (
    <Badge variant={item.variant} dot className={className}>
      {item.label}
    </Badge>
  );
}
