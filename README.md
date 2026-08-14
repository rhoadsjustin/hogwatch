# HogWatch

Mobile-first Arkansas football analytics dashboard + ChatGPT App/MCP starter.

## Product goal
HogWatch helps Arkansas fans evaluate the 2026 Razorbacks beyond wins and losses. It tracks the HOG Index, opponent-adjusted trends, player development, and coaching performance, then exposes the same structured data to ChatGPT for questions like "Is the offensive line actually improving?" or "How has Ron Roberts changed the defense since Week 1?"

## What is included
- Next.js responsive web UI matching the approved mock direction
- Season dashboard, game detail, coach detail, player detail, trends
- Shared TypeScript domain model and HOG Index calculator
- Mock 2026 Arkansas data behind a repository layer
- MCP server skeleton exposing season/game/coach/trend tools

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
`packages/core` owns domain contracts and scoring. `apps/web` consumes those contracts through a repository. `apps/mcp` exposes the same data as tools. Replace the mock repository with a real stats provider without changing the screens.

See `AGENTS.md` for the Codex handoff and implementation priorities.
