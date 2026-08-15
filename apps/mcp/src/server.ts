import { mockHogWatchRepository } from '@hogwatch/data';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { createHogWatchToolData } from './tool-data.js';

const server = new McpServer({ name: 'hogwatch', version: '0.2.0' });
const tools = createHogWatchToolData(mockHogWatchRepository);

const jsonResponse = (payload: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(payload) }] });
const missing = (entity: string, id: string) => jsonResponse({ error: 'not_found', entity, id });

server.tool('get_season_dashboard', 'Return Arkansas season progress, latest game, HOG Index components, and biggest signals.', {}, async () => jsonResponse(await tools.getSeasonDashboard()));

server.tool('get_game_analysis', 'Return a structured Arkansas game analysis, including scorecard metrics and HOG Index breakdown when final.', {
  gameId: z.string().min(1).describe('HogWatch game ID, such as "utah".'),
}, async ({ gameId }) => {
  const report = await tools.getGameAnalysis(gameId);
  return report ? jsonResponse(report) : missing('game', gameId);
});

server.tool('get_coach_report', 'Return a coach scorecard, implication, and opponent-adjusted trend.', {
  coachId: z.string().min(1).describe('HogWatch coach ID, such as "roberts".'),
}, async ({ coachId }) => {
  const report = await tools.getCoachReport(coachId);
  return report ? jsonResponse(report) : missing('coach', coachId);
});

server.tool('get_player_report', 'Return a player profile, role-on-film context, stock signal, and weekly trend.', {
  playerId: z.string().min(1).describe('HogWatch player ID, such as "kj-jackson".'),
}, async ({ playerId }) => {
  const report = await tools.getPlayerReport(playerId);
  return report ? jsonResponse(report) : missing('player', playerId);
});

server.tool('get_metric_trend', 'Return a weekly, opponent-aware series for one canonical HogWatch metric.', {
  metricId: z.string().min(1).describe('Canonical metric ID, such as "pressure-allowed" or "hog-index".'),
}, async ({ metricId }) => {
  const trend = await tools.getMetricTrend(metricId);
  return trend ? jsonResponse(trend) : missing('metric', metricId);
});

server.tool('compare_games', 'Compare two completed Arkansas games across their shared canonical metrics.', {
  gameAId: z.string().min(1).describe('Earlier or baseline HogWatch game ID.'),
  gameBId: z.string().min(1).describe('Later or comparison HogWatch game ID.'),
}, async ({ gameAId, gameBId }) => {
  const comparison = await tools.compareGames(gameAId, gameBId);
  return comparison ? jsonResponse(comparison) : jsonResponse({ error: 'comparison_unavailable', gameAId, gameBId, detail: 'Both game IDs must exist and refer to completed games.' });
});

await server.connect(new StdioServerTransport());
