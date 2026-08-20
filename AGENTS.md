# AGENTS.md — HogWatch

## Mission
Build a polished, mobile-first Arkansas Razorbacks football analytics product that helps fans evaluate team and coaching improvement week-to-week, not merely consume box scores. The same structured analytics must power both the web UI and ChatGPT/MCP tools.

## Product principles
1. Mobile first. The primary viewport is an iPhone-sized screen; desktop should expand gracefully.
2. Tell a football story. Prefer trends, opponent-adjusted context, and coaching implications over stat dumps.
3. Evidence over vibes. Every AI answer should be traceable to structured game/player/coach metrics where possible.
4. One analytics definition. HOG Index and derived metrics live only in `packages/core`.
5. Provider-independent UI. Screens never call a sports API directly; they consume repository/service contracts.
6. Mock-first, real-data-ready. Keep the app useful with fixtures while preserving a clean path to production ingestion.

## Architecture
- `apps/web`: Next.js App Router responsive UI.
- `apps/mcp`: MCP server for ChatGPT tools/resources.
- `packages/core`: TypeScript domain types, scoring, metric metadata, opponent-adjustment logic.
- Future `packages/data`: provider adapters, persistence, normalization.

## MVP routes
- `/` Season dashboard: record, HOG Index, latest game, biggest improvements/concerns, next-up call, schedule.
- `/games/[id]`: matchup preview (unit collisions + projection) before kickoff; HOG Index breakdown, scorecard metrics, and game story after.
- `/compare`: any two games with measured metrics, side by side on national percentiles.
- `/coaches/[id]`: Silverfield/Cramsey/Roberts scorecard and weekly trend.
- `/players/[id]`: player card, weekly metrics, role/stock trend.
- `/trends`: season metric explorer with rolling and opponent-adjusted views.

## Prediction model
Predictions are denominated in scoreboard points, never in index units.
`ratingFromHogIndex` converts a HOG grade to points above an average FBS team;
the margin is a difference of ratings plus home field and a documented matchup
adjustment; the win probability is the normal CDF of the same distribution that
produces the reported range. Predictions are retained after kickoff and scored
(`scorePrediction`), and the running record is exposed as a report. Do not
silently change `POWER_RATING`; update tests and documentation in the same PR.

## HOG Index
100-point model:
- Offense: 30%
- Defense: 30%
- Coaching: 25%
- Development: 15%

Important inputs include offensive/defensive success rate, pressure allowed/generated, four-man pressure, explosive-play differential, rush success, yards before contact, turnover-worthy plays, missed tackles, red-zone TD rate, penalties/pre-snap penalties, special teams, and second-half performance.

Do not silently change weights. If weights change, update tests and documentation in the same PR.

## ChatGPT/MCP target tools
- `get_season_dashboard`
- `get_game_analysis`
- `get_coach_report`
- `get_player_report`
- `get_metric_trend`
- `compare_games`
- `get_matchup_preview`
- `get_prediction_record`
- later: `get_position_group`, `get_drive_analysis`

Tool results should return concise structured JSON suitable for both model reasoning and custom ChatGPT UI. Avoid returning presentation HTML from tools.

## UI direction
Use the approved HogWatch visual direction: Arkansas-cardinal accents, dark/neutral high-contrast surfaces, large numeric scorecards, compact trend indicators, strong spacing, and minimal chrome. Avoid generic admin-dashboard styling. Charts must remain legible on mobile.

Every major detail view should include an Ask affordance. Build the context payload as structured IDs/metrics plus the on-screen view (selected metric, visible weeks), not a giant prose prompt. Answers return structured references so the app can tie prose back to the chart beside it.

Charts must never autoscale to their own min/max. Use `metricChartDomain` for a fixed per-metric domain with the FBS average marked, and do not draw a trend line below `MINIMUM_TREND_POINTS` observations.

Every surface must state its provenance. HogWatch mixes a live schedule with fixture-backed grading and modelled opponent values; a reader must always be able to tell which is which.

## Engineering rules
- TypeScript strict mode.
- Prefer server components unless client interactivity is required.
- Keep domain logic out of React components.
- No `any` in domain/data code.
- Add unit tests for scoring and normalization before changing analytics formulas.
- Accessible semantic HTML and keyboard support.
- Avoid unnecessary dependencies.
- Do not commit secrets; document required variables in `.env.example`.

## Pull request evidence
- Every pull request description must state its visual impact. For any change that affects a rendered surface, embed current screenshots in the description so reviewers can validate it without running the branch.
- Capture at least one affected mobile route at 390px wide and one affected desktop route. Label each image with its route and viewport; include additional state screenshots when the change has meaningful variants (for example, empty, future-game, error, or expanded states).
- Use real rendered evidence from the PR branch, not mockups or local-only file paths. Prefer GitHub-hosted Markdown images; if screenshots are versioned as review artifacts, keep them under `docs/pr-screenshots/` and link the exact branch files from the PR description.
- For a non-visual PR, say `Visual impact: none` in the description rather than silently omitting the evidence section.

## Initial Codex objective
Make the existing starter production-shaped and visually faithful before expanding scope:
1. Verify install/build/typecheck.
2. Fix dependency/workspace issues.
3. Refine dashboard to approved mobile mock direction.
4. Implement reusable metric/trend/scorecard components.
5. Add tests for HOG Index.
6. Improve MCP tool schemas and share repository data with web/MCP.
7. Leave real sports API ingestion behind a provider interface; do not couple the UI to a vendor yet.

## Definition of done for MVP foundation
- `npm ci` and build/typecheck pass in CI.
- All five routes render responsively at 390px and desktop widths.
- HOG Index has tests and documented weights.
- Mock data is accessed through a repository interface.
- MCP server starts and exposes at least season dashboard, metric trend, and game comparison tools.
- README contains setup and architecture notes.
