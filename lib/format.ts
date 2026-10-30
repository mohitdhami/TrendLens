export function formatCompact(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "—";
  const absolute = Math.abs(value);
  if (absolute < 1_000) return String(Math.round(value));
  if (absolute < 1_000_000) {
    return `${(value / 1_000).toFixed(absolute < 10_000 ? 1 : 0).replace(/\.0$/, "")}K`;
  }
  if (absolute < 1_000_000_000) {
    return `${(value / 1_000_000).toFixed(value < 10_000_000 ? digits : 1).replace(/\.0$/, "")}M`;
  }
  return `${(value / 1_000_000_000).toFixed(digits).replace(/\.0$/, "")}B`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

export function formatPercent(value: number, signed = false, digits = 1): string {
  if (!Number.isFinite(value)) return "—";
  const sign = signed && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits).replace(/\.0$/, "")}%`;
}

export function formatGrowth(ratePerDay: number): string {
  return formatPercent(ratePerDay * 100, true, 1);
}

export function formatLift(current: number, predicted: number): number {
  if (!current) return 0;
  return (predicted / current - 1) * 100;
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "—";
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    return `${hours}:${String(minutes % 60).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

export function timeAgo(input: string | number, now = Date.now()): string {
  const timestamp = typeof input === "number" ? input : new Date(input).getTime();
  const seconds = Math.max(0, (now - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export function formatDate(input: string | number): string {
  const date = new Date(input);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export function formatDayDate(input: string | number): string {
  return new Date(input).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatAge(ageDays: number): string {
  if (ageDays < 1) return `${Math.round(ageDays * 24)}h old`;
  if (ageDays < 30) return `${Math.round(ageDays)}d old`;
  return `${Math.round(ageDays / 30)}mo old`;
}

export interface ScoreBand {
  label: string;
  text: string;
  bg: string;
  border: string;
  hex: string;
}

export function scoreBand(score: number): ScoreBand {
  if (score >= 85) {
    return {
      label: "Extreme",
      text: "text-lime-300",
      bg: "bg-lime-400/10",
      border: "border-lime-400/25",
      hex: "#c6ff4a"
    };
  }
  if (score >= 70) {
    return {
      label: "Strong",
      text: "text-mint-300",
      bg: "bg-mint-400/10",
      border: "border-mint-400/25",
      hex: "#4ae3c6"
    };
  }
  if (score >= 55) {
    return {
      label: "Building",
      text: "text-amber-400",
      bg: "bg-amber-400/10",
      border: "border-amber-400/25",
      hex: "#ffbd5c"
    };
  }
  return {
    label: "Quiet",
    text: "text-fog-400",
    bg: "bg-white/[0.04]",
    border: "border-white/[0.08]",
    hex: "#8495a5"
  };
}

export function directionInfo(direction: "rising" | "steady" | "cooling"): {
  label: string;
  text: string;
  bg: string;
} {
  if (direction === "rising") {
    return { label: "Rising", text: "text-lime-300", bg: "bg-lime-400/10 border-lime-400/20" };
  }
  if (direction === "cooling") {
    return { label: "Cooling", text: "text-coral-400", bg: "bg-coral-400/10 border-coral-400/20" };
  }
  return { label: "Steady", text: "text-fog-300", bg: "bg-white/[0.04] border-white/[0.08]" };
}

export function truncate(value: string, max = 60): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
