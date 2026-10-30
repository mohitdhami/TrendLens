import { promises as fs } from "node:fs";
import path from "node:path";
import type { RawVideo, TimePoint } from "./types";

interface HistoryDatabase {
  updatedAt: number;
  videos: Record<string, TimePoint[]>;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const HISTORY_FILE = path.join(DATA_DIR, "history.json");
const MAX_POINTS_PER_VIDEO = 40;
const MAX_AGE_MS = 30 * 86_400_000;
const PRUNE_AFTER_MS = 45 * 86_400_000;

let writeQueue: Promise<unknown> = Promise.resolve();

async function readDatabase(): Promise<HistoryDatabase> {
  try {
    const raw = await fs.readFile(HISTORY_FILE, "utf8");
    const parsed = JSON.parse(raw) as HistoryDatabase;
    if (!parsed || typeof parsed !== "object" || !parsed.videos) {
      return { updatedAt: 0, videos: {} };
    }
    return parsed;
  } catch {
    return { updatedAt: 0, videos: {} };
  }
}

function prune(points: TimePoint[], now: number): TimePoint[] {
  const cutoff = now - MAX_AGE_MS;
  return points
    .filter((point) => point.t >= cutoff && Number.isFinite(point.views))
    .sort((a, b) => a.t - b.t)
    .slice(-MAX_POINTS_PER_VIDEO);
}

/**
 * Appends a snapshot for every fetched live video. Writes are serialized and
 * failures are swallowed so analytics can still run on read-only hosts.
 */
export async function recordLiveSnapshots(videos: RawVideo[]): Promise<Record<string, TimePoint[]>> {
  const run = writeQueue.then(async () => {
    const now = Date.now();
    const database = await readDatabase();
    const output: Record<string, TimePoint[]> = {};
    const idSet = new Set(videos.map((video) => video.id));

    for (const video of videos) {
      const existing = database.videos[video.id] ?? [];
      const previous = existing[existing.length - 1];
      const snapshot: TimePoint = {
        t: now,
        views: video.views,
        likes: video.likes,
        comments: video.comments
      };

      if (previous && now - previous.t < 5 * 60 * 1000) {
        existing[existing.length - 1] = snapshot;
      } else {
        existing.push(snapshot);
      }

      const pruned = prune(existing, now);
      database.videos[video.id] = pruned;
      output[video.id] = pruned;
    }

    for (const [id, points] of Object.entries(database.videos)) {
      if (idSet.has(id)) continue;
      const last = points[points.length - 1];
      if (!last || now - last.t > PRUNE_AFTER_MS) {
        delete database.videos[id];
      }
    }

    database.updatedAt = now;

    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(HISTORY_FILE, JSON.stringify(database), "utf8");
    } catch {
      // Read-only environment — return in-memory history only.
    }

    return output;
  });

  writeQueue = run.catch(() => undefined);
  return run;
}

export async function readHistoryFor(ids: string[]): Promise<Record<string, TimePoint[]>> {
  const database = await readDatabase();
  const output: Record<string, TimePoint[]> = {};
  for (const id of ids) {
    if (database.videos[id]) output[id] = database.videos[id];
  }
  return output;
}

export async function historyStats(): Promise<{ videosTracked: number; points: number; updatedAt: number }> {
  const database = await readDatabase();
  const entries = Object.values(database.videos);
  return {
    videosTracked: entries.length,
    points: entries.reduce((sum, points) => sum + points.length, 0),
    updatedAt: database.updatedAt
  };
}
