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

Each report carries a `provenance` object. The starter repository reports
`source: "mock"` and its coverage explicitly, so ChatGPT can distinguish
fixture evidence from future provider-backed analytics.

`render_season_dashboard` is an optional MCP Apps presentation tool. It
returns the same repository-derived dashboard data plus the portable resource
`ui://hogwatch/season-dashboard-v1.html`; the six analytics tools remain
useful in clients that do not render MCP Apps UI.

## Local MCP smoke test

Install dependencies, then run the stdio server:

```bash
npm ci
npm run dev:mcp
```

To inspect the live tool catalog, start `npx @modelcontextprotocol/inspector`,
select **STDIO**, and configure command `npm` with arguments `run dev:mcp` in
this repository. Verify initialization, invoke every analytics tool with both
valid and invalid IDs, then invoke `render_season_dashboard` and confirm the
MCP Apps resource renders the HOG Index, signals, and fixture provenance.

## Deploying a public ChatGPT endpoint

This starter intentionally runs over stdio for local development; it is not a
public endpoint. Before plugin submission, host the same server behind MCP
streamable HTTP at a stable public HTTPS URL (normally ending in `/mcp`). Add
authentication when data becomes private, retain authorization inside tool
handlers, and provide request-level logs/metrics without writing credentials
or full sensitive tool results. Use a real persistent host rather than a
temporary tunnel, and run the MCP Inspector against the production endpoint
after deployment. See the [OpenAI MCP server deployment guidance](https://developers.openai.com/plugins/build/mcp-server)
and [MCP Apps UI guidance](https://developers.openai.com/plugins/build/chatgpt-ui).

See `AGENTS.md` for the Codex handoff and implementation priorities.
