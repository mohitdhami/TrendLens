"use client";

import { useState } from "react";
import { CATEGORY_MAP } from "@/lib/constants";
import { smartCaseTerm } from "@/lib/utils";
import type { RawVideo } from "@/lib/types";
import { CategoryGlyph } from "./ui";

type ArtworkVideo = Pick<RawVideo, "id" | "thumbnail" | "categoryId" | "source" | "tags" | "title">;

const GRADIENTS = [
  ["#20351a", "#0a0f0b"],
  ["#1b2938", "#080b10"],
  ["#2d1f3d", "#0c0812"],
  ["#3a2419", "#0e0a07"],
  ["#173036", "#070d0f"],
  ["#2c2a1a", "#0d0c07"],
  ["#331d25", "#10080c"],
  ["#1d2b2a", "#080e0e"]
];

export function VideoArtwork({
  video,
  variant = "thumb",
  className = ""
}: {
  video: ArtworkVideo;
  variant?: "thumb" | "feature" | "compact";
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const category = CATEGORY_MAP.get(video.categoryId);
  const color = category?.color ?? "#c6ff4a";
  const hash = [...video.id].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const gradient = GRADIENTS[hash % GRADIENTS.length];
  const keyword = video.tags[0] ?? video.title.split(" ").slice(0, 2).join(" ");
  const showImage = Boolean(video.thumbnail) && !failed;

  const aspect = variant === "feature" ? "aspect-[16/10]" : variant === "compact" ? "aspect-square" : "aspect-video";

  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-white/[0.07] ${aspect} ${className}`}
      style={{ background: `linear-gradient(145deg, ${gradient[0]} 0%, ${gradient[1]} 72%)` }}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={video.thumbnail ?? ""}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <>
          <div
            className="absolute -right-10 -top-12 h-40 w-40 rounded-full opacity-30 blur-2xl"
            style={{ backgroundColor: color }}
          />
          <svg
            viewBox="0 0 400 225"
            className="absolute inset-0 h-full w-full"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
          >
            <defs>
              <pattern id={`grid-${video.id}`} width="22" height="22" patternUnits="userSpaceOnUse">
                <path d="M 22 0 L 0 0 0 22" fill="none" stroke="rgba(255,255,255,0.055)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="400" height="225" fill={`url(#grid-${video.id})`} />
            <circle cx="318" cy="50" r="74" fill="none" stroke={color} strokeOpacity="0.17" strokeWidth="1" />
            <circle cx="318" cy="50" r="48" fill="none" stroke={color} strokeOpacity="0.11" strokeWidth="1" />
            <circle cx="318" cy="50" r="22" fill={color} fillOpacity="0.06" stroke={color} strokeOpacity="0.22" />
            <path
              d="M-20 205 L150 35 M20 245 L210 55"
              stroke={color}
              strokeOpacity="0.09"
              strokeWidth="1"
            />
          </svg>
          <div className="absolute left-[14%] top-[18%] opacity-80" style={{ color }}>
            <CategoryGlyph categoryId={video.categoryId} size={variant === "feature" ? 44 : 26} />
          </div>
          {variant !== "compact" ? (
            <>
              <div className="absolute left-3 top-3 flex items-center gap-1.5">
                <span className="rounded border border-white/10 bg-ink-950/55 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.16em] text-fog-300 backdrop-blur-sm">
                  {video.source === "demo" ? "Demo feed" : "Live chart"}
                </span>
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950/95 via-ink-950/50 to-transparent px-3 pb-2.5 pt-8">
                <div className="font-mono text-[8px] uppercase tracking-[0.2em]" style={{ color }}>
                  {category?.name ?? "Trend signal"}
                </div>
                <div
                  className={`mt-1 truncate font-display font-semibold leading-tight text-fog-100 ${
                    variant === "feature" ? "text-lg" : "text-[11px]"
                  }`}
                >
                  {smartCaseTerm(keyword)}
                </div>
              </div>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
