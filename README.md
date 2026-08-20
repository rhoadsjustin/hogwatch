# HogWatch

Mobile-first Arkansas football analytics dashboard + ChatGPT App/MCP starter.

## Product goal
HogWatch helps Arkansas fans evaluate the 2026 Razorbacks beyond wins and losses. It tracks the HOG Index, opponent-adjusted trends, player development, and coaching performance, then exposes the same structured data to ChatGPT for questions like "Is the offensive line actually improving?" or "How has Ron Roberts changed the defense since Week 1?"

## What is included
- Next.js responsive web UI matching the approved mock direction
- Native Expo iOS client using the same analytics repository contract
- Season dashboard, game detail, coach detail, player detail, trends
- Shared TypeScript domain model, HOG Index calculator, and transparent pregame prediction calculator
- Mock 2026 Arkansas data behind a shared, provider-independent repository
- MCP server exposing the same season, game, coach, player, trend, and comparison data as the web UI

## Run
```bash
npm ci
npm run dev
```

Run MCP separately with `npm run dev:mcp`.

Run the native iOS app with Expo Go or an iOS Simulator:

```bash
npm run ios
```

The native app reads the same repository reports through the Worker when
`EXPO_PUBLIC_HOGWATCH_API_URL` is set in `apps/mobile/.env.local`; otherwise it
uses clearly labeled fixtures for Expo Go development. It never bundles an
OpenAI key or calls a sports provider directly.

## Verification

```bash
npm run typecheck
npm test
npm run build
```

The HOG Index is calculated in `@hogwatch/core` with documented component
weights: offense 30%, defense 30%, coaching 25%, and development 15%.

HogWatch Predictions are early, explainable pregame calls—not betting lines.
The shared calculator weights current HOG form at 70% and camp readiness at
30%, then applies the opponent comparison rating, location (2.5 points), and
an explicit matchup adjustment. Each scheduled matchup shows its win chance,
score projection, and inputs.

## Architecture
`packages/core` owns domain contracts, canonical advanced-metric metadata,
opponent adjustment, rolling-window primitives, prediction scoring, and HOG
Index scoring. `packages/data`
owns the `HogWatchRepository` contract, a normalized provider boundary, and
its mock implementation. Both `apps/web` and `apps/mcp` consume that
repository, so a future stats provider can replace the mock without changing
screens or tool payloads. See [the provider contract](docs/DATA_PROVIDER_CONTRACT.md)
for the required raw data and normalization rules.

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

## Live schedule and final-score research

HogWatch reads the current official Arkansas Razorbacks football schedule and
final scores directly from the athletics site, then stores the validated result
in cache for 15 minutes. It intentionally does **not** invent or estimate
advanced metrics: HOG Index, player, coach, and trend reports remain
fixture-backed until a verified play-level data provider is connected.

Copy `.env.example` to `.env.local` and set `HOGWATCH_LIVE_DATA_ENABLED=true`.
No OpenAI key is required for the normal live schedule path. An administrator
may set `HOGWATCH_OPENAI_WEB_SEARCH_FALLBACK=true` and provide
`OPENAI_API_KEY` only to recover from an official-source outage; this is never
exposed as a public MCP tool. MCP responses retain the official-source citation
for grounded answers.

## ChatGPT App deployment (Cloudflare Worker)

`apps/mcp` includes a Worker-compatible, stateless Streamable HTTP endpoint at
`/mcp`, read-only native-app report endpoints under `/api`, and a health check
at `/health`. It is separate from the local stdio server, so local ChatGPT/MCP
development remains simple.

```bash
npm run dev:worker -w @hogwatch/mcp
npm run deploy:worker -w @hogwatch/mcp
# Only when enabling the emergency OpenAI fallback:
npx wrangler secret put OPENAI_API_KEY --config apps/mcp/wrangler.jsonc
```

The normal Worker schedule path does not need an OpenAI secret. Set the
`OPENAI_API_KEY` Worker secret to enable the grounded `POST /api/ask` endpoint
(and, only if deliberately enabled, the emergency web-search fallback). The
mobile client submits structured report IDs rather than free-form prompts; the
Worker resolves the report, gives that evidence to the Responses API, and
returns a concise answer with its provenance. The key remains only in the
Worker. The endpoint is protected by a separate 10-requests-per-minute per-IP
edge limiter; add authenticated per-user quotas before offering it as a paid
or private feature.

After deployment, set the Worker origin—not `/mcp`—in
`apps/mobile/.env.local`:

```bash
EXPO_PUBLIC_HOGWATCH_API_URL=https://hogwatch-mcp.<your-subdomain>.workers.dev
```

Restart Expo after changing the value, then configure the resulting
`https://…/mcp` URL in ChatGPT Apps and verify it with MCP Inspector before
sharing it.

Before a public ChatGPT connection, provision the shared schedule cache in the
Cloudflare account that owns the Worker, then add the generated namespace ID to
`apps/mcp/wrangler.jsonc` under the `HOGWATCH_SCHEDULE_CACHE` binding:

```bash
npx wrangler kv namespace create hogwatch-schedule-cache --binding HOGWATCH_SCHEDULE_CACHE --update-config --config apps/mcp/wrangler.jsonc
```

The Worker keeps validated cited schedule data in KV for 15 minutes and also
uses a 30-tool-call-per-minute-per-client-IP edge limiter. It limits only
`tools/call`, so ChatGPT initialization, tool discovery, health checks, and UI
resource reads remain available. The edge limiter is a coarse abuse guard (not
an identity quota); add authenticated per-user limits before private or paid
data is introduced.

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
