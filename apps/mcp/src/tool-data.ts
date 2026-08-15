import type { HogWatchRepository } from '@hogwatch/data';

/**
 * A thin, presentation-free boundary for MCP. Keeping tool lookups here makes
 * it possible to test the same repository-backed payloads without a stdio
 * transport or an MCP client.
 */
export function createHogWatchToolData(repository: HogWatchRepository) {
  return {
    getSeasonDashboard: () => repository.getSeasonDashboard(),
    getGameAnalysis: (gameId: string) => repository.getGameAnalysis(gameId),
    getCoachReport: (coachId: string) => repository.getCoachReport(coachId),
    getPlayerReport: (playerId: string) => repository.getPlayerReport(playerId),
    getMetricTrend: (metricId: string) => repository.getMetricTrend(metricId),
    compareGames: (gameAId: string, gameBId: string) => repository.compareGames(gameAId, gameBId),
  };
}
