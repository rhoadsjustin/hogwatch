import { hogWatchRepository, type HogWatchRepository } from '@hogwatch/data';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { SEASON_DASHBOARD_RESOURCE_URI, seasonDashboardWidget } from './season-dashboard-widget.js';
import { createHogWatchToolData } from './tool-data.js';

const readOnly = { readOnlyHint: true, destructiveHint: false, openWorldHint: false } as const;
const provenanceSchema = z.object({
  source: z.enum(['mock', 'provider']),
  provider: z.string(),
  coverage: z.string(),
  updatedAt: z.string().datetime(),
  sources: z.array(z.object({ title: z.string(), url: z.string().url() })).optional(),
});
const reportSchema = z.object({ provenance: provenanceSchema }).passthrough();
const errorSchema = z.object({ error: z.string(), entity: z.string().optional(), id: z.string().optional() }).passthrough();
const reportOrErrorSchema = z.union([reportSchema, errorSchema]);

const response = <T extends object>(payload: T, text: string) => ({
  structuredContent: payload,
  content: [{ type: 'text' as const, text }],
});

const missing = (entity: string, id: string) => response(
  { error: 'not_found', entity, id },
  `No HogWatch ${entity} was found for “${id}”.`,
);

export function createHogWatchServer(repository: HogWatchRepository = hogWatchRepository) {
  const server = new McpServer(
    { name: 'hogwatch', version: '0.3.0' },
    { instructions: 'Use HogWatch for evidence-backed Arkansas 2026 football analytics. Reports include provenance; state when data is mock or coverage is incomplete. All tools are read-only.' },
  );
  const tools = createHogWatchToolData(repository);

  server.registerResource('hogwatch-season-dashboard', SEASON_DASHBOARD_RESOURCE_URI, {}, async () => ({
    contents: [{
      uri: SEASON_DASHBOARD_RESOURCE_URI,
      mimeType: 'text/html;profile=mcp-app',
      text: seasonDashboardWidget,
      _meta: { ui: { prefersBorder: true, csp: { connectDomains: [], resourceDomains: [] } } },
    }],
  }));

  server.registerTool('get_season_dashboard', {
    title: 'Get Arkansas season dashboard',
    description: 'Use for Arkansas season progress, latest game, HOG Index components, and the biggest evidence-backed signals.',
    inputSchema: {}, outputSchema: reportSchema, annotations: readOnly,
  }, async () => response(await tools.getSeasonDashboard(), 'Returned the Arkansas season dashboard with provenance.'));

  server.registerTool('get_game_analysis', {
    title: 'Get Arkansas game analysis',
    description: 'Use for a structured Arkansas game analysis, including scorecard metrics and HOG Index breakdown when final.',
    inputSchema: { gameId: z.string().min(1).describe('HogWatch game ID, such as "utah".') }, outputSchema: reportOrErrorSchema, annotations: readOnly,
  }, async ({ gameId }) => {
    const report = await tools.getGameAnalysis(gameId);
    return report ? response(report, `Returned the Week ${report.game.week} ${report.game.opponent} analysis with provenance.`) : missing('game', gameId);
  });

  server.registerTool('get_matchup_preview', {
    title: 'Get Arkansas matchup preview',
    description: 'Use for a pregame matchup: unit-vs-unit collisions on a shared national-percentile scale, a point-denominated projection with its likely range, and the swing factors.',
    inputSchema: { gameId: z.string().min(1).describe('HogWatch game ID, such as "georgia".') }, outputSchema: reportOrErrorSchema, annotations: readOnly,
  }, async ({ gameId }) => {
    const preview = await tools.getMatchupPreview(gameId);
    return preview
      ? response(preview, `Returned the Week ${preview.game.week} ${preview.opponent.name} matchup preview with provenance.`)
      : missing('matchup', gameId);
  });

  server.registerTool('get_prediction_record', {
    title: 'Get HogWatch prediction record',
    description: 'Use to check how well HogWatch has predicted so far: correct calls, mean margin error, and Brier score against a coin flip.',
    inputSchema: {}, outputSchema: reportSchema, annotations: readOnly,
  }, async () => {
    const record = await tools.getPredictionRecord();
    return response(record, `Returned the prediction record across ${record.gamesScored} scored game${record.gamesScored === 1 ? '' : 's'}.`);
  });

  server.registerTool('get_coach_report', {
    title: 'Get Arkansas coach report',
    description: 'Use for a HogWatch coach scorecard, coaching implication, and opponent-adjusted trend.',
    inputSchema: { coachId: z.string().min(1).describe('HogWatch coach ID, such as "roberts".') }, outputSchema: reportOrErrorSchema, annotations: readOnly,
  }, async ({ coachId }) => {
    const report = await tools.getCoachReport(coachId);
    return report ? response(report, `Returned ${report.coach.name}'s scorecard and trend with provenance.`) : missing('coach', coachId);
  });

  server.registerTool('get_player_report', {
    title: 'Get Arkansas player report',
    description: 'Use for a HogWatch player profile, role-on-film context, stock signal, and weekly trend.',
    inputSchema: { playerId: z.string().min(1).describe('HogWatch player ID, such as "kj-jackson".') }, outputSchema: reportOrErrorSchema, annotations: readOnly,
  }, async ({ playerId }) => {
    const report = await tools.getPlayerReport(playerId);
    return report ? response(report, `Returned ${report.player.name}'s report and trend with provenance.`) : missing('player', playerId);
  });

  server.registerTool('get_metric_trend', {
    title: 'Get Arkansas metric trend',
    description: 'Use for a weekly, opponent-aware series for one canonical HogWatch metric.',
    inputSchema: { metricId: z.string().min(1).describe('Canonical metric ID, such as "pressure-allowed" or "hog-index".') }, outputSchema: reportOrErrorSchema, annotations: readOnly,
  }, async ({ metricId }) => {
    const trend = await tools.getMetricTrend(metricId);
    return trend ? response(trend, `Returned the ${trend.label} trend with provenance.`) : missing('metric', metricId);
  });

  server.registerTool('compare_games', {
    title: 'Compare Arkansas games',
    description: 'Use to compare two Arkansas games across their shared measured metrics, with a national percentile for each value. Both games must carry measured metrics; a final score is not required.',
    inputSchema: {
      gameAId: z.string().min(1).describe('Earlier or baseline HogWatch game ID.'),
      gameBId: z.string().min(1).describe('Later or comparison HogWatch game ID.'),
    }, outputSchema: reportOrErrorSchema, annotations: readOnly,
  }, async ({ gameAId, gameBId }) => {
    const comparison = await tools.compareGames(gameAId, gameBId);
    return comparison
      ? response(comparison, `Compared ${comparison.gameA.opponent} and ${comparison.gameB.opponent} with provenance.`)
      : response({ error: 'comparison_unavailable', gameAId, gameBId, detail: 'Both game IDs must exist, differ, and carry measured metrics.' }, 'The requested comparison is unavailable.');
  });

  server.registerTool('render_season_dashboard', {
    title: 'Render Arkansas season dashboard',
    description: 'Render the current HogWatch season dashboard when a visual scorecard helps the user inspect its evidence. The data remains available without this UI.',
    inputSchema: {}, outputSchema: z.object({ dashboard: reportSchema }), annotations: readOnly,
    _meta: {
      ui: { resourceUri: SEASON_DASHBOARD_RESOURCE_URI },
      'openai/outputTemplate': SEASON_DASHBOARD_RESOURCE_URI,
      'openai/toolInvocation/invoking': 'Preparing season dashboard…',
      'openai/toolInvocation/invoked': 'Season dashboard ready.',
    },
  }, async () => response(
    { dashboard: await tools.getSeasonDashboard() },
    'Rendered the Arkansas season dashboard with provenance.',
  ));

  return server;
}
