# HogWatch

Mobile-first Arkansas football analytics dashboard + ChatGPT App/MCP starter.

## Product goal
HogWatch helps Arkansas fans evaluate the 2026 Razorbacks beyond wins and losses. It tracks the HOG Index, opponent-adjusted trends, player development, and coaching performance, then exposes the same structured data to ChatGPT for questions like "Is the offensive line actually improving?" or "How has Ron Roberts changed the defense since Week 1?"

## What is included
- Next.js responsive web UI matching the approved mock direction
- Season dashboard, game detail, coach detail, player detail, trends
- Shared TypeScript domain model and HOG Index calculator
- Mock 2026 Arkansas data behind a shared, provider-independent repository
- MCP server exposing the same season, game, coach, player, trend, and comparison data as the web UI

## Run
```bash
npm ci
npm run dev
```

Run MCP separately with `npm run dev:mcp`.

## Verification

```bash
npm run typecheck
npm test
npm run build
```

The HOG Index is calculated in `@hogwatch/core` with documented component
weights: offense 30%, defense 30%, coaching 25%, and development 15%.

## Architecture
`packages/core` owns domain contracts, metric metadata, and scoring. `packages/data` owns the `HogWatchRepository` contract and its mock implementation. Both `apps/web` and `apps/mcp` consume that repository, so a future stats provider can replace the mock without changing screens or tool payloads.

## MCP tools

- `get_season_dashboard`
- `get_game_analysis`
- `get_coach_report`
- `get_player_report`
- `get_metric_trend`
- `compare_games`

See `AGENTS.md` for the Codex handoff and implementation priorities.
