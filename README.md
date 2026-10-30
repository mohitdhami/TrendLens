# TrendLens

**See the curve before it breaks.** Multi-region YouTube trend intelligence with a precision signal engine, cross-market analysis, calibrated forecasts and a shoot-ready content playbook.

Built with Next.js 15, React 19, TypeScript and Tailwind CSS. It works immediately with a deterministic demo dataset — no API key required — and switches to live YouTube regional charts when a YouTube Data API v3 key is available.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The first scan runs automatically against the demo dataset.

```bash
npm run build   # production build
npm run start   # serve the production build
npm run typecheck
npm test
```

## Live YouTube data

Add a key to `.env.local`:

```bash
YOUTUBE_API_KEY=AIza...
```

Or paste a key in the app's **Data source** dialog. Browser-entered keys are stored in `localStorage`, sent only as the `x-youtube-key` header on analysis requests, and never persisted on the server.

Data source modes:

| Mode | Behaviour |
| --- | --- |
| Auto | Uses live charts when a key is available; falls back to demo. |
| Live only | Requests YouTube regional charts; falls back to demo with a visible warning on failure. |
| Demo | Deterministic synthetic data. No API calls or key required. |

Enable **YouTube Data API v3** in Google Cloud Console. A regional most-popular chart read costs 1 quota unit. Results are cached in memory for 20 minutes, and live snapshots are appended to `.data/history.json` so momentum and forecast calibration improve over time.

## What it does

- **Multi-market scans** — up to 12 YouTube regions and up to 4 categories per run.
- **Precision gate** — a configurable 0–100 dial that changes both the scoring weights and the number of signals that survive.
- **Cross-market intelligence** — region × category heatmaps, opportunity scores and overlap detection.
- **Momentum topology** — momentum vs engagement bubble map, trajectory badges and score breakdowns.
- **Keyword opportunity** — extracted terms ranked by momentum, spread, whitespace and category fit.
- **Publish timing** — UTC day/hour heatmap built from when the qualified signals went live.
- **Forecasting** — 7/30/90-day cumulative view projections with 80% intervals, walk-forward holdout backtest and auto-calibrated damping.
- **Content playbook** — ranked ideas with format, angle, hook, target market, hashtags and estimated view ranges.
- **Reporting** — executive brief preview plus JSON, CSV and Markdown exports and copy-ready briefs.
- **Signal dossier** — per-video evidence, score breakdown, forecast chart and copyable brief.

## How the signal engine works

1. **Fetch** regional YouTube most-popular charts (or build the demo dataset for the selected markets).
2. **Merge** videos that appear on multiple regional charts and attach available view-history snapshots.
3. **Hard filter** by category, minimum views, maximum age, duration and excluded keywords.
4. **Score** each candidate with percentile ranks for:
   - velocity (views/day)
   - momentum (robust log-growth from history)
   - engagement (likes + weighted comments)
   - freshness (age decay)
   - cross-market reach
   - keyword relevance
5. **Apply precision weights** — exploratory scans favour reach and freshness; strict scans favour acceleration and engagement. Precision also reduces the effective signal cap.
6. **Rank** the qualified signals, then infer trajectory and estimate breakout probability.
7. **Forecast** each signal with a damped power-law momentum model. The damping scale is chosen from a grid that minimises median holdout error across the observed histories.
8. **Aggregate** keywords, categories, markets, timing, overlaps and content ideas from the qualified set.

Scores are relative to the current scan. Changing markets, categories or precision recalibrates the baseline, so compare within a run rather than across runs.

## Demo mode

The demo dataset is deterministic for a given UTC day. It includes realistic topic families, variants, category mixes, preferred publish hours, region affinities, cross-region memberships and synthetic daily histories. It exists so the full workflow can be explored without credentials.

Every demo surface is labelled. Demo numbers are not evidence of real audience demand.

## API

### `GET /api/trends`

Returns health information and whether a server-side key is configured.

### `POST /api/trends`

```json
{
  "filters": {
    "regions": ["US", "GB", "IN", "BR", "JP", "DE"],
    "categories": [],
    "precision": 55,
    "includeKeywords": [],
    "excludeKeywords": [],
    "minViews": 10000,
    "maxAgeDays": 30,
    "duration": "any",
    "limit": 24,
    "mode": "auto"
  }
}
```

Optional header: `x-youtube-key: AIza...`

The response contains `videos` (fully scored signals with histories and forecasts), `insights` (summary, categories, regions, matrix, keywords, suggestions, timing, overlaps, forecast summary) and `meta` (source, warnings, precision, weights, gate threshold, timings).

## Project structure

```text
app/
  api/trends/route.ts       API request validation, live/demo selection
  layout.tsx                Metadata and app shell
  page.tsx                  Dynamic dashboard entry
  globals.css               Theme, components and animations
components/
  TrendDashboard.tsx        Client shell, fetch state, persistence, tabs
  FilterPanel.tsx           Analysis desk controls
  RegionModal.tsx           Market selection
  SettingsModal.tsx         Data source and key configuration
  TrendTable.tsx            Sortable signal leaderboard
  FeaturedSignal.tsx        Top-signal feature card
  VideoDetail.tsx           Signal dossier drawer
  charts.tsx                Custom SVG visualisations
  tabs/                     Overview, Markets, Topics, Forecast, Playbook, Report
lib/
  analytics/                Scoring, forecasts, keywords, suggestions
  demo.ts                   Deterministic multi-market demo dataset
  live.ts                   YouTube Data API integration and cache
  history.ts                Live snapshot persistence
  constants.ts              Regions, categories and defaults
tests/                      Analytics and forecast tests
```

## Limitations

- Demo data is synthetic and explicitly labelled.
- Live mode reads regional most-popular charts at snapshot time, not real-time YouTube Analytics.
- Forecasts are directional. They do not model paid promotion, algorithm changes, competitor uploads, seasonality or external events.
- Opportunity and breakout scores are relative to the selected scan.
- Live forecast confidence improves only after several days of snapshot collection.

## License

Private project. All rights reserved.
